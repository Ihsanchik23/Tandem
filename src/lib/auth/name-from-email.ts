// Имя и фамилия для нового профиля — из адреса почты (на регистрации их не спрашиваем).
// Правило: часть до «@», без всего после «+», делим по «.», «_», «-», убираем цифры,
// пустые куски выбрасываем. Первый кусок — имя, второй — фамилия, остальные не нужны.
// Каждое — с заглавной буквы (остальные строчные), не длиннее 60 символов.
// Если букв не осталось — имя по умолчанию (fallback), фамилия пустая.
// Пользователь потом меняет имя и фамилию в редактировании профиля.
const MAX = 60;

export function nameFromEmail(email: string, fallback: string): { first_name: string; last_name: string } {
  const local = email.trim().split("@")[0].split("+")[0];
  const parts = local
    .split(/[._-]+/)
    .map((p) => p.replace(/\d+/g, ""))
    .filter(Boolean);
  const [first, last] = parts.map(capitalize);
  return { first_name: first || fallback.slice(0, MAX), last_name: last ?? "" };
}

function capitalize(word: string): string {
  const lower = word.toLowerCase();
  return (lower.charAt(0).toUpperCase() + lower.slice(1)).slice(0, MAX);
}
