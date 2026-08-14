# Recupero Debito Inglese — Meta Manual Build Sheet

**Execution state:** READY FOR HUMAN EXECUTION  
**Required status at construction:** **PAUSED** at campaign, ad set and ad level.  
**Activation gate:** **Technical GO + Commerce GO**.  
**No teen personalised targeting.**

This is one validation campaign only:

**1 campaign → 1 adult-buyer ad set → 2 parent ads**

No additional paid concepts are authorised in this sheet.

---

# CAMPAIGN

| Field | Exact value |
|---|---|
| Campaign name | `IT | Meta | Parent | Recupero Debito | Aug26 | Validation` |
| Buying type | Auction |
| Objective | **Traffic** |
| Campaign status | **PAUSED** |
| Advantage campaign budget | **OFF** — use the single ad-set daily budget for this validation |
| A/B test | OFF |
| Special/ad category | Do not select one unless Ads Manager requires it for a reason outside this marketing plan |

## Why Traffic for this first build

The destination is the free diagnostic and the first validation question is whether relevant adult traffic reaches and starts that diagnostic. Do not configure new runtime tracking or force purchase optimisation from this workstream.

---

# AD SET — Adult buyer / parent

| Field | Exact value |
|---|---|
| Ad set name | `AS1 | Parents 30+ | Italy | Diagnostic` |
| Status | **PAUSED** |
| Conversion location | Website |
| Performance goal | Maximise landing page views |
| Daily budget | **€6.00/day** |
| Test window after GO | 48 hours |
| First-window spend ceiling | **€12 total** |
| Start | Manual enable only after both GO gates |
| End | No fixed end date; pause manually at the €12 first-window ceiling for review |
| Location | Italy |
| Age | **30–65+** |
| Gender | All |
| Languages | Italian |
| Detailed targeting | **None** — keep broad adult-buyer validation |
| Custom audiences | None at launch |
| Lookalikes | None at launch |
| Teen targeting | **None** |
| Placements | **Manual: Facebook Feed + Instagram Feed only** for the first test |
| Audience Network | OFF |
| Messenger placements | OFF |
| Tracking | Use existing first-party/Meta tracking only if already confirmed; do not add runtime code from this workstream |

## Destination

`https://sbloccoinglese.com/test-recupero-inglese`

The paid campaign remains paused even though the destination is the free diagnostic. The paid test is explicitly gated on Technical + Commerce GO in the accepted launch plan.

---

# AD 1 — Parent structure

## Build fields

| Field | Exact value |
|---|---|
| Ad name | `AD1 | Parent Structure | A2 Static` |
| Status | **PAUSED** |
| Identity | Sblocco Inglese Facebook Page / connected Instagram account |
| Format | Single image |
| Creative | **A2 — parent static**, 1080×1350 primary feed export |
| Destination | Website |
| CTA | `Scopri di più` |
| Final URL | `https://sbloccoinglese.com/test-recupero-inglese` |
| UTM content | `parent_meta_structure_v1` |

## UTM URL

`https://sbloccoinglese.com/test-recupero-inglese?utm_source=facebook&utm_medium=paid_social&utm_campaign=recupero_august_2026&utm_content=parent_meta_structure_v1`

If Instagram Feed serves the ad, use Ads Manager placement reporting to separate it. Do not create a second ad merely to change `utm_source`.

## Primary text — paste exactly

```text
Se tuo figlio ha il debito in inglese, il problema non è sempre trovare altro materiale. Spesso è capire cosa viene prima.

Recupero Debito Inglese parte dal programma assegnato dalla scuola, dal tempo che resta e da un test gratuito di 24 domande. Il risultato distingue ciò che è già abbastanza solido, ciò che va ripassato e ciò che ha priorità.

Prima di acquistare il percorso potete vedere il punto di partenza.

Il test non predice il voto e il percorso non garantisce il superamento della prova.
```

## Headline

`Prima capisci cosa va ripassato`

## Optional description

`Test gratuito · 24 domande · circa 6–8 minuti`

## Creative mapping

**A2 parent static** must show:
- headline: `Un piano di recupero, non un altro elenco di cose da fare.`
- programme + days left + weak areas;
- GO-cleared Recovery plan screenshot;
- CTA: `Fai fare il test gratuito`.

**Creative gate:** A2 is not final until its real plan screenshot has Technical GO.

---

# AD 2 — Parent time / programme

## Build fields

| Field | Exact value |
|---|---|
| Ad name | `AD2 | Parent Time | A4 Carousel` |
| Status | **PAUSED** |
| Identity | Sblocco Inglese Facebook Page / connected Instagram account |
| Format | Carousel |
| Creative | **A4 — five-slide carousel, POST-GO export** |
| Number of cards | 5 |
| Destination | Website |
| CTA | `Scopri di più` |
| Final URL | `https://sbloccoinglese.com/test-recupero-inglese` |
| UTM content | `parent_meta_time_v1` |

## UTM URL

`https://sbloccoinglese.com/test-recupero-inglese?utm_source=facebook&utm_medium=paid_social&utm_campaign=recupero_august_2026&utm_content=parent_meta_time_v1`

## Primary text — paste exactly

```text
Quando una prova di recupero si avvicina, ripassare tutto nello stesso modo può diventare un altro problema.

Recupero Debito Inglese mette insieme programma della scuola, data della prova e aree deboli per costruire un ordine di lavoro. Lo studente passa poi da recupero guidato a esercizi, modalità scuola e verifica.

Il primo passo è gratuito: 24 domande, circa 6–8 minuti.

Il percorso completo costa €39 una volta sola, senza abbonamento.

Nessuna previsione del voto. Nessuna garanzia di superamento.
```

## Headline

`Un piano per i giorni che restano`

## Optional description

`Prima il test gratuito. Poi, se serve, il percorso completo.`

## Carousel card mapping

All five cards use the same destination/UTM URL.

| Card | Image | Card headline | Destination |
|---|---|---|---|
| 1 | `A4_carousel_post_go_slide01_4x5_v1.png` | `Non ripassare tutto a caso` | Diagnostic URL |
| 2 | `A4_carousel_post_go_slide02_4x5_v1.png` | `Test gratuito` | Diagnostic URL |
| 3 | `A4_carousel_post_go_slide03_4x5_v1.png` | `Programma + data` | Diagnostic URL |
| 4 | `A4_carousel_post_go_slide04_4x5_v1.png` | `Recupera e verifica` | Diagnostic URL |
| 5 | `A4_carousel_post_go_slide05_4x5_v1.png` | `Fai il test gratuito` | Diagnostic URL |

**Creative gate:** A4 post-GO export requires both the GO-cleared runtime screenshots and Commerce GO for the slide-5 €39 line.

---

# PRE-PUBLISH / PRE-ENABLE QA

## Campaign/ad set

- [ ] Campaign objective = Traffic.
- [ ] Campaign PAUSED.
- [ ] Ad set PAUSED.
- [ ] Ads PAUSED.
- [ ] Budget = €6/day at ad-set level.
- [ ] Italy only.
- [ ] Age = 30–65+.
- [ ] All genders.
- [ ] Italian language.
- [ ] No teen ad set.
- [ ] No teen detailed targeting.
- [ ] No Custom Audience based on minors.
- [ ] No lookalike at launch.
- [ ] Placements = Facebook Feed + Instagram Feed only.

## Creative/copy

- [ ] AD1 uses **A2**, not a newly invented creative.
- [ ] AD2 uses **A4 post-GO**, not a fifth creative.
- [ ] A2 final screenshot has Technical GO.
- [ ] A4 screenshots have Technical GO.
- [ ] A4 post-GO €39 text has Commerce GO.
- [ ] No pass guarantee.
- [ ] No grade prediction.
- [ ] No AI-pass claim.
- [ ] No Readiness v2 claim.
- [ ] No two-complete-mock-exams claim.

## Runtime/commerce gates

- [ ] Technical GO received.
- [ ] Commerce GO received.
- [ ] Production sales landing no longer contains `due simulazioni quando il tempo lo permette` before any purchase-led follow-through is promoted.
- [ ] Diagnostic final URL opens on mobile.
- [ ] UTM URL opens correctly.
- [ ] Existing tracking is checked without requesting runtime changes from this workstream.

## Final state

After manual construction, leave **campaign + ad set + both ads PAUSED**. Do not call the campaign submitted/live until a human has actually submitted/enabled it in Meta Ads Manager.
