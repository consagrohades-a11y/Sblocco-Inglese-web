from pathlib import Path

root = Path(__file__).resolve().parents[1]
admin_path = root / 'src/pages/AdminRecoveryContent.jsx'
package_path = root / 'package.json'
validator_path = root / 'scripts/validate-recovery-wave-publish.mjs'

source = admin_path.read_text()
marker = '\n  async function syncPublishedMappings() {'
if marker not in source:
    raise SystemExit('AdminRecoveryContent sync marker not found')
if 'async function publishValidatedRecoveryWave()' in source:
    raise SystemExit('Wave 1 publish function already exists')

publish_function = r'''
  async function publishValidatedRecoveryWave() {
    if (waveBusy) return;
    const missingTopics = recoveryWaveBundles.filter((entry) => !isTopicReady(mappings, entry.topicKey));
    if (!missingTopics.length) {
      setMessage('Wave 1 già pubblicata: tutti i topic disponibili hanno le quattro fasi attive.');
      return;
    }

    const confirmed = window.confirm(
      `Pubblicare ${missingTopics.length} topic Wave 1 validati in production? `
      + 'L’operazione usa i controlli di pubblicazione dell’Exercise Builder e poi sincronizza i mapping Recovery.',
    );
    if (!confirmed) return;

    setWaveBusy(true);
    setMessage('');
    setError('');
    try {
      let createdBatches = 0;
      let reusedBatches = 0;
      let promotedItems = 0;
      let publishedExercises = 0;
      let skippedCovered = 0;
      const publishedTopics = [];

      for (const entry of recoveryWaveBundles) {
        if (!entry.topicKey || !RECOVERY_TOPICS.some((topic) => topic.key === entry.topicKey)) {
          throw new Error(`${entry.fileName}: topic Recovery non riconosciuto.`);
        }
        if (isTopicReady(mappings, entry.topicKey)) {
          skippedCovered += 1;
          continue;
        }

        const validation = validateExerciseBuilderJson(entry.bundle);
        const invalidItems = (validation.items || []).filter((item) => item.status === 'invalid');
        if (validation.errors?.length || invalidItems.length) {
          const detail = [
            ...(validation.errors || []),
            ...invalidItems.flatMap((item) => item.errors || []),
          ].slice(0, 5).join(' · ');
          throw new Error(`${entry.fileName}: pubblicazione bloccata dal validator. ${detail}`);
        }

        const hash = await contentHash(entry.bundle);
        const sourceName = `recovery-wave-1:${entry.fileName}:${hash}`;
        let batch = await findExistingBatch(sourceName);
        if (!batch) {
          const selectedIndexes = (validation.items || [])
            .filter((item) => ['valid', 'warning'].includes(item.status))
            .map((item) => item.index);
          batch = await createExerciseBuilderImportBatch({
            validation,
            rawPayload: entry.bundle,
            sourceName,
            selectedIndexes,
            createdBy: user?.id || null,
          });
          createdBatches += 1;
        } else {
          reusedBatches += 1;
        }

        let items = await listExerciseBuilderImportItems(batch.id);
        const pendingIds = items
          .filter((item) => ['valid', 'warning'].includes(item.validation_status) && !item.promoted_entity_id)
          .map((item) => item.id);
        if (pendingIds.length) {
          const result = await promoteExerciseBuilderImportItems(batch.id, pendingIds);
          promotedItems += Number(result?.promoted_count || 0);
          items = await listExerciseBuilderImportItems(batch.id);
        }

        const exerciseItems = items.filter(
          (item) => item.entity_type === 'exercise'
            && ['valid', 'warning'].includes(item.validation_status)
            && item.promoted_entity_id,
        );
        if (!exerciseItems.length) {
          throw new Error(`${entry.fileName}: nessun esercizio promosso disponibile per la pubblicazione.`);
        }

        for (const item of exerciseItems) {
          const { error: publishError } = await supabase.rpc('admin_set_exercise_builder_status', {
            p_entity_type: 'exercise',
            p_entity_id: item.promoted_entity_id,
            p_next_status: 'published',
          });
          if (publishError) {
            throw new Error(`${entry.fileName} · ${item.client_key || item.id}: ${publishError.message}`);
          }
          publishedExercises += 1;
        }

        publishedTopics.push(entry.topicKey);
      }

      const { data: syncData, error: syncError } = await supabase.rpc('admin_sync_recovery_wave_mappings');
      if (syncError) throw syncError;
      await load();

      setMessage(
        `Wave 1 pubblicata: ${publishedTopics.length} topic elaborati, ${publishedExercises} esercizi pubblicati, `
        + `${promotedItems} elementi promossi, ${createdBatches} nuovi batch, ${reusedBatches} batch riusati, `
        + `${skippedCovered} topic già coperti. Mapping sincronizzati: ${syncData?.synced_mappings || 0}. `
        + `Topic pronti: ${syncData?.ready_topics || 0}.`,
      );
    } catch (publishError) {
      setError(publishError.message || 'Non è stato possibile pubblicare la Wave 1 validata.');
    } finally {
      setWaveBusy(false);
    }
  }
'''

source = source.replace(marker, '\n' + publish_function + marker, 1)

old_copy = """                  I bundle nel repository vengono validati con il contratto reale dell’Exercise Builder e promossi come draft/in review. Nessun esercizio viene auto-pubblicato. Dopo la review editoriale, il sync collega solo versioni approved + published.\n"""
new_copy = """                  I bundle nel repository vengono sempre validati con il contratto reale dell’Exercise Builder. Puoi importarli in review oppure pubblicare esplicitamente la Wave validata: anche il percorso rapido passa dai normali controlli di publishability prima di sincronizzare i mapping Recovery.\n"""
if old_copy not in source:
    raise SystemExit('Admin Recovery pipeline copy not found')
source = source.replace(old_copy, new_copy, 1)

old_buttons = """              <div className=\"flex flex-wrap gap-2\">\n                <button type=\"button\" disabled={waveBusy || loading} onClick={importRecoveryWave} className={adminButton.primary}>\n                  {waveBusy ? 'Operazione in corso...' : 'Importa Wave 1 in review'}\n                </button>\n                <button type=\"button\" disabled={waveBusy || loading} onClick={syncPublishedMappings} className={adminButton.secondary}>\n                  Sincronizza mapping pubblicati\n                </button>\n              </div>\n"""
new_buttons = """              <div className=\"flex flex-wrap gap-2\">\n                <button type=\"button\" disabled={waveBusy || loading} onClick={publishValidatedRecoveryWave} className={adminButton.primary}>\n                  {waveBusy ? 'Operazione in corso...' : 'Pubblica Wave 1 validata'}\n                </button>\n                <button type=\"button\" disabled={waveBusy || loading} onClick={importRecoveryWave} className={adminButton.secondary}>\n                  Importa Wave 1 in review\n                </button>\n                <button type=\"button\" disabled={waveBusy || loading} onClick={syncPublishedMappings} className={adminButton.secondary}>\n                  Sincronizza mapping pubblicati\n                </button>\n              </div>\n"""
if old_buttons not in source:
    raise SystemExit('Admin Recovery Wave buttons not found')
source = source.replace(old_buttons, new_buttons, 1)
admin_path.write_text(source)

validator = r'''import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/pages/AdminRecoveryContent.jsx', 'utf8');

assert.match(source, /async function publishValidatedRecoveryWave\(\)/, 'missing explicit Wave 1 publish action');
assert.match(source, /window\.confirm\(/, 'Wave 1 production publish must require explicit confirmation');
assert.match(source, /validateExerciseBuilderJson\(entry\.bundle\)/, 'publish path must use the real Exercise Builder validator');
assert.match(source, /isTopicReady\(mappings, entry\.topicKey\)/, 'publish path must skip already-covered topics');
assert.match(source, /item\.entity_type === 'exercise'/, 'publish path must scope publication to exercise import items');
assert.match(source, /admin_set_exercise_builder_status/, 'publish path must use the canonical Exercise Builder status RPC');
assert.match(source, /p_entity_type: 'exercise'/, 'publish path must only publish exercise entities');
assert.match(source, /p_next_status: 'published'/, 'publish path must explicitly request published status');
assert.match(source, /admin_sync_recovery_wave_mappings/, 'publish path must sync Recovery mappings after publication');
assert.match(source, /Pubblica Wave 1 validata/, 'admin must expose an explicit production publish control');
assert.equal((source.match(/publishValidatedRecoveryWave/g) || []).length, 2, 'publish action should only be defined and wired to its button');

console.log('Recovery Wave 1 explicit publish validation passed.');
'''
validator_path.write_text(validator)

package = package_path.read_text()
build_old = 'npm run validate:recovery-study-ahead && npm run validate:recovery-import'
build_new = 'npm run validate:recovery-study-ahead && npm run validate:recovery-wave-publish && npm run validate:recovery-import'
if build_old not in package:
    raise SystemExit('package build Recovery validation chain not found')
package = package.replace(build_old, build_new, 1)
script_old = '    "validate:recovery-study-ahead": "node scripts/validate-recovery-study-ahead.mjs",\n'
script_new = script_old + '    "validate:recovery-wave-publish": "node scripts/validate-recovery-wave-publish.mjs",\n'
if script_old not in package:
    raise SystemExit('package recovery-study-ahead script entry not found')
package = package.replace(script_old, script_new, 1)
package_path.write_text(package)

print('Patched explicit Recovery Wave 1 publish action, validator and build chain.')
