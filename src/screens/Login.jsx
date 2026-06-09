import { useState } from 'react'
import { createUserWithEmailAndPassword, deleteUser, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, getDoc, runTransaction } from 'firebase/firestore'
import { auth, db } from '../firebase.js'

const USERNAME_RE = /^[a-z][a-z0-9_]{2,23}$/
const VERIFICATION_COOLDOWN_MS = 15 * 60 * 1000
const MAX_HEARTS = 10

async function sendEmailVerificationSafely(user) {
  try {
    await sendEmailVerification(user, {
      url: window.location.origin,
      handleCodeInApp: false,
    })
  } catch (error) {
    if (error.code !== 'auth/unauthorized-continue-uri') throw error
    await sendEmailVerification(user)
  }
}

async function sendPasswordResetSafely(email) {
  try {
    await sendPasswordResetEmail(auth, email, {
      url: window.location.origin,
      handleCodeInApp: false,
    })
  } catch (error) {
    if (error.code !== 'auth/unauthorized-continue-uri') throw error
    await sendPasswordResetEmail(auth, email)
  }
}

const countries = [
  { code: 'IQ', ar: 'العراق', en: 'Iraq', cities: ['بغداد', 'البصرة', 'الموصل', 'أربيل', 'النجف', 'كربلاء', 'السليمانية'] },
  { code: 'SA', ar: 'السعودية', en: 'Saudi Arabia', cities: ['الرياض', 'جدة', 'مكة', 'المدينة', 'الدمام'] },
  { code: 'AE', ar: 'الإمارات', en: 'UAE', cities: ['دبي', 'أبوظبي', 'الشارقة', 'عجمان'] },
  { code: 'KW', ar: 'الكويت', en: 'Kuwait', cities: ['مدينة الكويت', 'حولي', 'الفروانية', 'الجهراء'] },
  { code: 'JO', ar: 'الأردن', en: 'Jordan', cities: ['عمان', 'إربد', 'الزرقاء', 'العقبة'] },
  { code: 'OTHER', ar: 'دولة أخرى', en: 'Other', cities: ['أخرى'] },
]

const text = {
  ar: {
    back: 'رجوع',
    login: 'تسجيل الدخول',
    register: 'إنشاء حساب',
    details: 'معلومات إضافية',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    confirm: 'تأكيد كلمة المرور',
    name: 'الاسم',
    username: 'Username',
    phone: 'رقم الهاتف',
    birthday: 'تاريخ الميلاد',
    country: 'الدولة',
    city: 'المدينة',
    chooseCountry: 'اختر الدولة',
    chooseCity: 'اختر المدينة',
    next: 'التالي',
    create: 'إنشاء الحساب',
    enter: 'دخول',
    loading: 'جاري التحميل...',
    guest: 'تابع كزائر',
    switchRegister: 'ليس لدي حساب - إنشاء حساب',
    switchLogin: 'لدي حساب بالفعل - تسجيل دخول',
    forgotPassword: 'نسيت كلمة المرور؟',
    resetSent: 'تم إرسال رابط استرجاع كلمة المرور إلى بريدك.',
    resetHint: 'اكتب بريدك الإلكتروني حتى نرسل رابط الاسترجاع.',
    or: 'أو',
    requiredName: 'الاسم مطلوب',
    requiredUsername: 'Username مطلوب',
    usernameEnglish: 'Username لازم يبدأ بحرف إنكليزي ويحتوي حروف إنكليزية أو أرقام أو _ فقط، من 3 إلى 24 حرف.',
    usernameTaken: 'هذا الـ username مأخوذ، جرّب واحد ثاني.',
    requiredEmail: 'البريد الإلكتروني مطلوب',
    requiredPassword: 'كلمة المرور مطلوبة',
    shortPassword: 'كلمة المرور قصيرة جدا',
    mismatch: 'كلمتا المرور غير متطابقتين',
  },
  en: {
    back: 'Back',
    login: 'Log in',
    register: 'Create account',
    details: 'More details',
    email: 'Email',
    password: 'Password',
    confirm: 'Confirm password',
    name: 'Name',
    username: 'Username',
    phone: 'Phone',
    birthday: 'Birthday',
    country: 'Country',
    city: 'City',
    chooseCountry: 'Choose country',
    chooseCity: 'Choose city',
    next: 'Next',
    create: 'Create account',
    enter: 'Enter',
    loading: 'Loading...',
    guest: 'Continue as guest',
    switchRegister: 'No account - create one',
    switchLogin: 'I already have an account - log in',
    forgotPassword: 'Forgot password?',
    resetSent: 'Password reset link sent to your email.',
    resetHint: 'Enter your email so we can send a reset link.',
    or: 'or',
    requiredName: 'Name is required',
    requiredUsername: 'Username is required',
    usernameEnglish: 'Username must start with an English letter and use only English letters, numbers, or _, 3-24 characters.',
    usernameTaken: 'This username is already taken.',
    requiredEmail: 'Email is required',
    requiredPassword: 'Password is required',
    shortPassword: 'Password is too short',
    mismatch: 'Passwords do not match',
  },
}

export default function Login({ lang = 'ar', onBack, onLogin }) {
  const t = text[lang] || text.en
  const [mode, setMode] = useState('login')
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    birthDate: '',
    country: '',
    city: '',
  })

  const selectedCountry = countries.find((country) => country.code === form.country)
  const update = (key) => (event) => setForm((value) => ({ ...value, [key]: event.target.value }))
  const normalizedUsername = form.username.toLowerCase().trim().replace(/^@+/, '').replace(/\s+/g, '_').replace(/[^a-z0-9_]+/g, '').slice(0, 24)

  const validateAuthFields = () => {
    if (mode === 'register' && !form.name.trim()) return t.requiredName
    if (mode === 'register' && !normalizedUsername) return t.requiredUsername
    if (mode === 'register' && !USERNAME_RE.test(normalizedUsername)) return t.usernameEnglish
    if (!form.email.trim()) return t.requiredEmail
    if (!form.password) return t.requiredPassword
    if (form.password.length < 6) return t.shortPassword
    if (mode === 'register' && form.password !== form.confirmPassword) return t.mismatch
    return ''
  }

  const handleRegister = async () => {
    const validation = validateAuthFields()
    if (validation) return setError(validation)

    setLoading(true)
    setError('')
    let result = null
    try {
      const usernameRef = doc(db, 'usernames', normalizedUsername)
      const usernameSnap = await getDoc(usernameRef)
      if (usernameSnap.exists()) {
        setError(t.usernameTaken)
        return
      }

      result = await createUserWithEmailAndPassword(auth, form.email, form.password)
      await updateProfile(result.user, { displayName: form.name })
      const createdAt = new Date().toISOString()
      await runTransaction(db, async (transaction) => {
        const freshUsernameSnap = await transaction.get(usernameRef)
        if (freshUsernameSnap.exists()) throw new Error('username-taken')

        transaction.set(usernameRef, {
          uid: result.user.uid,
          username: normalizedUsername,
          createdAt,
          updatedAt: createdAt,
        })

        transaction.set(doc(db, 'users', result.user.uid), {
          userName: form.name,
          userUsername: normalizedUsername,
          email: form.email,
          emailVerified: false,
          phone: form.phone,
          birthDate: form.birthDate,
          userBirthday: form.birthDate,
          country: selectedCountry?.[lang] || '',
          city: form.city,
          xp: 0,
          hearts: MAX_HEARTS,
          gems: 2000,
          startingGemsGranted: true,
          streak: 1,
          lastActiveDate: createdAt.slice(0, 10),
          lastHeartRefillAt: new Date(createdAt).getTime(),
          progress: {},
          lessonProgress: {},
          perfectScores: 0,
          lastScore: 0,
          userAvatar: '',
          userBio: '',
          theme: 'light',
          lang,
          soundEnabled: true,
          fontScale: 1,
          cozyMode: true,
          isPaid: false,
          totalQuizzes: 0,
          createdAt,
          updatedAt: createdAt,
        }, { merge: true })
      })
      await sendEmailVerificationSafely(result.user).then(() => {
        const retryAt = Date.now() + VERIFICATION_COOLDOWN_MS
        localStorage.setItem('nihongo-verification-retry-at', String(retryAt))
        window.dispatchEvent(new CustomEvent('nihongo-verification-sent', { detail: { retryAt } }))
      }).catch((error) => {
        console.warn('Failed to send verification email', error)
      })
      onLogin(form.name)
    } catch (err) {
      if (err.message === 'username-taken') {
        if (result?.user) await deleteUser(result.user).catch(() => {})
        setError(t.usernameTaken)
        return
      }
      setError(err.code || err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    const validation = validateAuthFields()
    if (validation) return setError(validation)

    setLoading(true)
    setError('')
    try {
      const result = await signInWithEmailAndPassword(auth, form.email, form.password)
      onLogin(result.user.displayName || form.email)
    } catch (err) {
      setError(err.code || err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!form.email.trim()) return setError(t.resetHint)
    setLoading(true)
    setError('')
    setMessage('')
    try {
      await sendPasswordResetSafely(form.email.trim())
      setMessage(t.resetSent)
    } catch (err) {
      setError(err.code || err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-screen">
      <header className="page-head compact">
        <button className="icon-btn" onClick={onBack}>←</button>
        <div>
          <p>にほんごGO</p>
          <h1>{mode === 'login' ? t.login : step === 1 ? t.register : t.details}</h1>
        </div>
      </header>

      <section className="auth-panel">
        {mode === 'login' && (
          <>
            <label>{t.email}<input type="email" value={form.email} onChange={update('email')} placeholder="example@email.com" /></label>
            <label>{t.password}<input type="password" value={form.password} onChange={update('password')} placeholder="••••••••" /></label>
          </>
        )}

        {mode === 'register' && step === 1 && (
          <>
            <label>{t.name}<input value={form.name} onChange={update('name')} /></label>
            <label>{t.username}<input value={form.username} onChange={update('username')} placeholder="@nihongo" /></label>
            <label>{t.email}<input type="email" value={form.email} onChange={update('email')} placeholder="example@email.com" /></label>
            <label>{t.phone}<input type="tel" value={form.phone} onChange={update('phone')} placeholder="+964 7XX XXX XXXX" /></label>
            <label>{t.password}<input type="password" value={form.password} onChange={update('password')} placeholder="••••••••" /></label>
            <label>{t.confirm}<input type="password" value={form.confirmPassword} onChange={update('confirmPassword')} placeholder="••••••••" /></label>
          </>
        )}

        {mode === 'register' && step === 2 && (
          <>
            <label>{t.birthday}<input type="date" value={form.birthDate} onChange={update('birthDate')} /></label>
            <label>{t.country}
              <select value={form.country} onChange={(event) => setForm((value) => ({ ...value, country: event.target.value, city: '' }))}>
                <option value="">{t.chooseCountry}</option>
                {countries.map((country) => <option key={country.code} value={country.code}>{country[lang]}</option>)}
              </select>
            </label>
            {selectedCountry && (
              <label>{t.city}
                <select value={form.city} onChange={update('city')}>
                  <option value="">{t.chooseCity}</option>
                  {selectedCountry.cities.map((city) => <option key={city} value={city}>{city}</option>)}
                </select>
              </label>
            )}
          </>
        )}

        {error && <p className="form-error">{error}</p>}
        {message && <p className="form-success">{message}</p>}

        {mode === 'login' && <button className="btn btn-primary" disabled={loading} onClick={handleLogin}>{loading ? t.loading : t.enter}</button>}
        {mode === 'login' && <button className="link-btn" disabled={loading} onClick={handlePasswordReset}>{t.forgotPassword}</button>}
        {mode === 'register' && step === 1 && <button className="btn btn-primary" onClick={() => { const v = validateAuthFields(); v ? setError(v) : setStep(2) }}>{t.next}</button>}
        {mode === 'register' && step === 2 && (
          <div className="split-actions">
            <button className="btn btn-secondary" onClick={() => setStep(1)}>{t.back}</button>
            <button className="btn btn-primary" disabled={loading} onClick={handleRegister}>{loading ? t.loading : t.create}</button>
          </div>
        )}

        <div className="divider"><span>{t.or}</span></div>
        <button className="btn btn-secondary" onClick={() => onLogin(lang === 'ar' ? 'زائر' : 'Guest')}>{t.guest}</button>
        <button className="link-btn" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setStep(1); setError('') }}>
          {mode === 'login' ? t.switchRegister : t.switchLogin}
        </button>
      </section>
    </main>
  )
}
