import React from 'react';
import CardArchiveWorkspace from '../components/admin/CardArchiveWorkspace';

export default function AdminWordTrainerArchive() {
  return (
    <CardArchiveWorkspace
      type="word"
      title="Archivio Word Trainer"
      itemType="word"
      listRpc="admin_list_word_cards"
      titleField="lemma"
      meaningField="italian_meaning"
      editorPath="/admin/content/words"
    />
  );
}
