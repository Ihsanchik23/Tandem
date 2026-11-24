// Все строки интерфейса на русском. Позже рядом появятся kk.ts и en.ts.
export const ru = {
  app: {
    name: "Tandem",
    tagline: "Социальная платформа для работы",
  },

  auth: {
    fields: {
      firstName: "Имя",
      lastName: "Фамилия",
      email: "Email",
      password: "Пароль",
      newPassword: "Новый пароль",
      confirmPassword: "Повторите пароль",
      passwordHint: "Не меньше 8 символов",
    },
    login: {
      title: "Вход",
      subtitle: "Войдите, чтобы продолжить работу",
      submit: "Войти",
      pending: "Входим…",
      forgot: "Забыли пароль?",
      noAccount: "Нет аккаунта?",
      toSignup: "Зарегистрироваться",
      resendConfirmation: "Отправить письмо ещё раз",
    },
    signup: {
      title: "Регистрация",
      subtitle: "Создайте аккаунт в Tandem",
      submit: "Зарегистрироваться",
      pending: "Создаём аккаунт…",
      haveAccount: "Уже есть аккаунт?",
      toLogin: "Войти",
    },
    forgot: {
      title: "Восстановление пароля",
      subtitle: "Укажите email — пришлём ссылку для нового пароля",
      submit: "Отправить ссылку",
      pending: "Отправляем…",
      backToLogin: "Вернуться ко входу",
    },
    reset: {
      title: "Новый пароль",
      subtitle: "Придумайте новый пароль для входа",
      submit: "Сохранить пароль",
      pending: "Сохраняем…",
    },
    checkEmail: {
      title: "Проверьте почту",
      signupText: "Мы отправили письмо со ссылкой для подтверждения на",
      signupTextNoEmail: "Мы отправили письмо со ссылкой для подтверждения.",
      recoveryText: "Если такой аккаунт есть, мы отправили ссылку для нового пароля на",
      recoveryTextNoEmail: "Если такой аккаунт есть, мы отправили ссылку для нового пароля.",
      hint: "Откройте письмо и нажмите на ссылку. Если письма нет — проверьте папку «Спам».",
      resend: "Отправить письмо ещё раз",
      resendPending: "Отправляем…",
      resent: "Письмо отправлено ещё раз",
      backToLogin: "Вернуться ко входу",
    },
    notices: {
      emailConfirmed: "Email подтверждён. Войдите в аккаунт",
      passwordChanged: "Пароль изменён",
    },
    signOut: "Выйти",
  },

  home: {
    title: "Главная",
    greeting: "Здравствуйте",
    placeholder: "Здесь скоро появится главная страница Tandem.",
    toWork: "Перейти в «Работу»",
  },

  work: {
    title: "Работа",
    placeholder: "Здесь скоро появится рабочее пространство компании.",
  },

  errors: {
    generic: "Не удалось выполнить действие. Попробуйте ещё раз",
    network: "Нет связи с сервером. Проверьте интернет и попробуйте ещё раз",
    required: "Заполните все поля",
    invalidEmail: "Проверьте email — похоже, в нём опечатка",
    passwordTooShort: "Пароль должен быть не меньше 8 символов",
    passwordsDontMatch: "Пароли не совпадают",
    invalidCredentials: "Неверный email или пароль",
    emailNotConfirmed: "Email ещё не подтверждён. Откройте письмо и нажмите на ссылку",
    weakPassword: "Пароль слишком простой. Придумайте пароль подлиннее",
    samePassword: "Новый пароль совпадает со старым",
    rateLimited: "Слишком много действий подряд. Подождите минуту",
    emailRateLimited: "Слишком много писем подряд. Подождите немного и попробуйте снова",
    emailNotAuthorized: "Сейчас не получается отправить письмо на этот адрес. Напишите в поддержку Tandem",
    signupDisabled: "Регистрация временно закрыта",
    linkExpired: "Ссылка устарела или уже использована. Запросите новое письмо",
    linkOtherBrowser:
      "Откройте ссылку в том же браузере, где запрашивали сброс пароля, или запросите новое письмо",
    sessionExpired: "Сессия закончилась. Войдите снова",
    userBanned: "Аккаунт заблокирован. Напишите в поддержку Tandem",
  },
} as const;

export type Messages = typeof ru;
export type ErrorKey = keyof Messages["errors"];
