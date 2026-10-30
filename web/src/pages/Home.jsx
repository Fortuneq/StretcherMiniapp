import { Link } from 'react-router-dom'
import { PAYMENT_URL } from '../lib/config'

const FEATURES = [
  {
    title: 'Сотни упражнений на любой запрос',
    text: 'Плечи затекли за рабочим днём, тянет поясницу, хочется просто размяться перед сном — подбери короткую или длинную практику под текущее состояние.',
    img: '/images/iphone-tuesday.png',
    alt: 'Экран приложения с подборкой упражнений',
  },
  {
    title: 'Прогресс, который видно',
    text: 'Отмечай выполненные практики, следи за сериями и мягко возвращайся к телу — без чувства вины и «пропущенных» дней.',
    img: '/images/iphone-dashboard.png',
    alt: 'Экран приложения со статистикой прогресса',
  },
  {
    title: 'Своя программа за минуту',
    text: 'Собери индивидуальную последовательность: выбирай упражнения, длительность и порядок. Программа сохранится и всегда будет под рукой.',
    img: '/images/iphone-select-stretches.png',
    alt: 'Экран приложения с настройкой программы',
  },
]

const REVIEWS = [
  { text: 'Первое приложение, которым я реально пользуюсь каждый день. Занимает 10 минут утром — спина сказала спасибо уже через неделю.', author: 'Аня, Москва' },
  { text: 'После рабочего дня за ноутом плечи буквально каменные. Короткая практика перед сном — и утром я снова человек.', author: 'Игорь, Санкт-Петербург' },
  { text: 'Люблю, что нет никакого «челленджа на 30 дней». Просто открываешь и тянешься сколько нужно.', author: 'Марина, Казань' },
  { text: 'Пробовала йогу, пилатес, зал — бросала всё. А тут прижилось: короткие блоки, спокойный голос, ничего не давит.', author: 'Света, Новосибирск' },
  { text: 'Собрал свою утреннюю программу под больную поясницу. Через месяц забыл, что она у меня «больная».', author: 'Дмитрий, Екатеринбург' },
  { text: 'Мягко, без надрыва. Очень человечное приложение — как будто рядом спокойный тренер.', author: 'Юля, Краснодар' },
]

export default function Home() {
  return (
    <>
      <section className="hero" id="top">
        <div className="hero__text">
          <h1>
            Двигайся — <span className="accent">каждый день понемногу.</span>
          </h1>
          <p>
            «Тянись» — простое приложение, которое возвращает телу подвижность за
            10 минут в день. Короткие практики растяжки, спокойный ритм и никакого
            давления.
          </p>
          <div className="hero__actions">
            <a className="btn btn--primary btn--lg" href={PAYMENT_URL}>
              Оформить подписку
            </a>
            <Link className="btn btn--ghost btn--lg" to="/routines">
              Смотреть практики
            </Link>
          </div>
          <p className="hero__note">
            После оплаты откроется мини-приложение в Telegram — заниматься можно
            прямо в мессенджере.
          </p>
        </div>
        <div className="hero__visual">
          <div className="phone-glow" aria-hidden="true" />
          <img
            src="/images/iphone-upward-salute.png"
            alt="Экран приложения Тянись"
            className="hero__phone"
          />
        </div>
      </section>

      <section className="features" id="features">
        <div className="section-heading">
          <h2>Растяжка — это просто. Попробуй сам.</h2>
          <p>
            Всё, что нужно, чтобы вернуть телу лёгкость: короткие практики,
            понятный прогресс и свобода собрать свою программу.
          </p>
        </div>
        <div className="features__grid">
          {FEATURES.map((f) => (
            <article className="feature" key={f.title}>
              <div className="feature__visual">
                <img src={f.img} alt={f.alt} />
              </div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="reviews" id="reviews">
        <div className="section-heading">
          <h2>Уже с нами тысячи людей</h2>
          <p>Что говорят те, кто вернул телу подвижность вместе с «Тянись».</p>
        </div>
        <div className="reviews__grid">
          {REVIEWS.map((r) => (
            <figure className="review" key={r.author}>
              <img src="/images/stars.svg" alt="Пять звёзд" className="review__stars" />
              <blockquote>{r.text}</blockquote>
              <figcaption>— {r.author}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="cta" id="pricing">
        <div className="cta__card">
          <h2>Первая неделя — бесплатно</h2>
          <p>
            Оформи подписку, попробуй практики неделю. Не подойдёт — отменишь
            одним нажатием.
          </p>
          <a className="btn btn--primary btn--lg" href={PAYMENT_URL}>
            Перейти к оплате
          </a>
          <p className="cta__hint">
            После оплаты вы попадёте в Telegram-мини-приложение «Тянись».
          </p>
        </div>
      </section>
    </>
  )
}
