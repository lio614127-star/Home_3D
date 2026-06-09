import React from 'react';
import { useUIStore } from '../../store/useUIStore';
import { useI18nStore } from '../../store/useI18nStore';

import { useTheme } from '../../theme/tokens';

export const ValidationPanel: React.FC = () => {
  const issues = useUIStore(state => state.validationIssues);
  const { t } = useI18nStore();
  const theme = useTheme();

  if (issues.length === 0) {
    return <div style={{ color: theme.accent, padding: '10px' }}>{t("validation.valid")}</div>;
  }

  const renderMessage = (msg: string) => {
    if (msg.startsWith('validation.fatalException:')) {
      const err = msg.split(':')[1];
      return t('validation.fatalException') + err;
    }
    if (msg.startsWith('validation.invalidJsonFormat:')) {
      const err = msg.split(':')[1];
      return t('validation.invalidJsonFormat') + err;
    }
    return t(msg);
  };

  return (
    <div style={{ padding: '10px', color: theme.textPrimary }}>
      <h4 style={{ marginTop: 0 }}>{t("validation.title")} ({issues.length})</h4>
      <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '13px' }}>
        {issues.map((issue, idx) => (
          <li key={idx} style={{ color: issue.severity === 'fatal' ? theme.danger : '#f57c00', marginBottom: '5px' }}>
            <strong>[{issue.severity === 'fatal' ? t('validation.fatalErrors') : t('validation.warnings')}]</strong> {renderMessage(issue.message)} 
            <br/>
            <span style={{ fontSize: '11px', color: theme.textSecondary }}>({t(`object.${issue.objectType}`)} - {issue.objectId})</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
