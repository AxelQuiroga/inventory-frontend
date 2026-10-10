import { Link } from 'react-router'
import styles from './ErrorPage.module.css'

type ErrorPageProps = {
  code: '403' | '404'
  title: string
  description: string
  actionLabel: string
  to?: string
}

export function ErrorPage({ code, title, description, actionLabel, to = '/' }: ErrorPageProps) {
  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="error-title">
        <p className={styles.eyebrow}>INVENTORY ERP · {code}</p>
        <div className={styles.code} aria-hidden="true">{code}</div>
        <h1 id="error-title" className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
        <Link className={styles.action} to={to}>{actionLabel}</Link>
      </section>
    </main>
  )
}
