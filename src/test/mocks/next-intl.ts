import React from 'react';

import messages from '@/messages/en.json';

type Messages = typeof messages;

const resolveMessage = (namespace: string | undefined, key: string): any => {
  const base: any = namespace ? (messages as any)[namespace as keyof Messages] : messages;
  return key.split('.').reduce<any>((acc, part) => (acc ? acc[part] : undefined), base);
};

const formatMessage = (template: string, values?: Record<string, unknown>): string => {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, token) => (
    token in values ? String(values[token]) : `{${token}}`
  ));
};

export const useTranslations = (namespace?: string) => (key: string, values?: Record<string, unknown>) => {
  const message = resolveMessage(namespace, key);
  if (typeof message === 'string') {
    return formatMessage(message, values);
  }
  return key;
};

export const useLocale = () => 'en';

export const NextIntlClientProvider = ({ children }: { children: React.ReactNode }) => (
  React.createElement(React.Fragment, null, children)
);

export default {
  useTranslations,
  useLocale,
  NextIntlClientProvider,
};
