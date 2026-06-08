import { useState } from 'react'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase.js'

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
    or: 'أو',
    requiredName: 'الاسم مطلوب',
    requiredUsername: 'Username مطلوب',
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
    or: 'or',
    requiredName: 'Name is required',
    requiredUsername: 'Username is required',
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
  const normalizedUsername = form.username.trim().replace(/^@+/, '').replace(/\s+/g, '_').replace(/[^\p{L}\p{N}_]+/gu, '').slice(0, 24)

  const validateAuthFields = () => {
    if (mode === 'register' && !form.name.trim()) return t.requiredName
    if (mode === 'register' && !normalizedUsername) return t.requiredUsername
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
    try {
      const result = await createUserWithEmailAndPassword(auth, form.email, form.password)
      await updateProfile(result.user, { displayName: form.name })
      const createdAt = new Date().toISOString()
      await setDoc(doc(db, 'users', result.user.uid), {
        userName: form.name,
        userUsername: normalizedUsername,
        email: form.email,
        phone: form.phone,
        birthDate: form.birthDate,
        userBirthday: form.birthDate,
        country: selectedCountry?.[lang] || '',
        city: form.city,
        xp: 0,
        hearts: 5,
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
      onLogin(form.name)
    } catch (err) {
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

        {mode === 'login' && <button className="btn btn-primary" disabled={loading} onClick={handleLogin}>{loading ? t.loading : t.enter}</button>}
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
