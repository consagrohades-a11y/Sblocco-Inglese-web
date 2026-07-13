import React from 'react';
import CardArchiveWorkspace from '../components/admin/CardArchiveWorkspace';

export default function AdminTrainerCardDelete() {
  return (
    <CardArchiveWorkspace
      type="expression"
      title="Archivio General Expressions"
      itemType="expression"
      listRpc="admin_list_expression_cards"
      titleField="canonical_text"
      meaningField="italian_meaning"
      editorPath="/admin/content/expressions"
    />
  );
}
