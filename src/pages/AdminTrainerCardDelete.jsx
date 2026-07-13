import React from 'react';
import CardArchiveWorkspace from '../components/admin/CardArchiveWorkspace';

const archiveDomains = {
  general: {
    type: 'expression',
    title: 'Archivio General Expressions',
    editorPath: '/admin/content/expressions',
  },
  business: {
    type: 'business',
    title: 'Archivio Business Expressions',
    editorPath: '/admin/content/business-expressions',
  },
  hospitality: {
    type: 'hospitality',
    title: 'Archivio Hospitality Expressions',
    editorPath: '/admin/content/hospitality-expressions',
  },
};

export default function AdminTrainerCardDelete({ domain = 'general' }) {
  const config = archiveDomains[domain] || archiveDomains.general;

  return (
    <CardArchiveWorkspace
      type={config.type}
      title={config.title}
      itemType="expression"
      listRpc="admin_list_expression_cards"
      titleField="canonical_text"
      meaningField="italian_meaning"
      editorPath={config.editorPath}
      domain={domain}
    />
  );
}
