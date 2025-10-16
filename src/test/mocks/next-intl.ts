import React from 'react';

import messages from '@/messages/en.json';

type MessageRecord = Record<string, unknown>;

const messageTree = messages as MessageRecord;

function getNamespaceTree(namespace?: string): MessageRecord | undefined {
  if (!namespace) {
    return messageTree;
  }

  return namespace
    .split('.')
    .reduce<MessageRecord | undefined>((acc, segment) => {
      if (!acc) {
        return undefined;
      }

      const next = acc[segment];
      return typeof next === 'object' && next !== null
        ? (next as MessageRecord)
        : undefined;
    }, messageTree);
}

function resolveMessage(namespace: string | undefined, key: string): unknown {
  const base = getNamespaceTree(namespace);
  return key.split('.').reduce<unknown>((acc, part) => {
    if (typeof acc !== 'object' || acc === null) {
      return undefined;
    }

    return (acc as MessageRecord)[part];
  }, base);
}

const formatMessage = (
  template: string,
  values?: Record<string, unknown>
): string => {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, token) =>
    token in values ? String(values[token]) : `{${token}}`
  );
};

export const useTranslations =
  (namespace?: string) => (key: string, values?: Record<string, unknown>) => {
    const message = resolveMessage(namespace, key);
    if (typeof message === 'string') {
      return formatMessage(message, values);
    }
    return key;
  };

export const useLocale = () => 'en';

export const NextIntlClientProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => React.createElement(React.Fragment, null, children);

const nextIntlMock = {
  useTranslations,
  useLocale,
  NextIntlClientProvider,
};

export default nextIntlMock;
