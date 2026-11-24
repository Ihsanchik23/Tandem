import { ru, type Messages } from "./ru";

export type Locale = "ru";

const dictionaries: Record<Locale, Messages> = { ru };

export const defaultLocale: Locale = "ru";

export function getMessages(locale: Locale = defaultLocale): Messages {
  return dictionaries[locale];
}

export const t = getMessages();

export { pluralRu, format } from "./format";
