import { useState } from 'react'
import { auth, db } from '../firebase.js'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'

const countries = [
  { code: 'IQ', name: 'العراق', cities: ['بغداد', 'البصرة', 'الموصل', 'أربيل', 'النجف', 'كربلاء', 'السليمانية', 'كركوك', 'الحلة', 'الناصرية'] },
  { code: 'SA', name: 'السعودية', cities: ['الرياض', 'جدة', 'مكة', 'المدينة', 'الدمام', 'الخبر', 'تبوك', 'أبها'] },
  { code: 'AE', name: 'الإمارات', cities: ['دبي', 'أبوظبي', 'الشارقة', 'عجمان', 'رأس الخيمة'] },
  { code: 'KW', name: 'الكويت', cities: ['مدينة الكويت', 'حولي', 'الفروانية', 'الجهراء'] },
  { code: 'JO', name: 'الأردن', cities: ['عمان', 'إربد', 'الزرقاء', 'العقبة'] },
  { code: 'EG', name: 'مصر', cities: ['القاهرة', 'الإسكندرية', 'الجيزة', 'شرم الشيخ'] },
  { code: 'OTHER', name: 'دولة أخرى', cities: ['أخرى'] },
]

export default function Login({ lang, onBack, onLogin, initialMode }) {
  const [mode, setMode] = useState(initialMode || 'login')
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')

  const selectedCountry = countries.find(c => c.code === country)

  const inputStyle = {
    width: '100%', padding: '14px 16px', background: '#12121f',
    border: '1px solid #1e1e30', borderRadius: '12px', color: 'white',
    fontSize: '15px', outline: 'none', direction: 'ltr', fontFamily: 'sans-serif'
  }

  const selectStyle = {
    ...inputStyle, cursor: 'pointer', appearance: 'none'
  }

  const handleRegister = async () => {
    setError('')
    if (!name.trim()) return setError('الاسم مطلوب')
    if (!email.trim()) return setError('البريد الإلكتروني مطلوب')
    if (!password) return setError('كلمة المرور مطلوبة')
    if (password.length < 6) return setError('كلمة المرور قصيرة جداً (6 أحرف على الأقل)')
    if (password !== confirmPassword) return setError('كلمتا المرور غير متطابقتان')

    setLoading(true)
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(result.user, { displayName: name })

      // Save to Firestore
      await setDoc(doc(db, 'users', result.user.uid), {
        name,
        email,
        phone: phone || '',
        birthDate: birthDate || '',
        country: selectedCountry?.name || '',
        city: city || '',
        xp: 0,
        streak: 0,
        totalQuizzes: 0,
        createdAt: new Date().toISOString(),
      })

      onLogin(name)
    } catch (err) {
      const errors = {
        'auth/email-already-in-use': 'البريد مستخدم بالفعل',
        'auth/invalid-email': 'بريد إلكتروني غير صحيح',
        'auth/weak-password': 'كلمة المرور ضعيفة جداً',
      }
      setError(errors[err.code] || err.message)
    }
    setLoading(false)
  }

  const handleLogin = async () => {
    setError('')
    if (!email.trim()) return setError('البريد الإلكتروني مطلوب')
    if (!password) return setError('كلمة المرور مطلوبة')

    setLoading(true)
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      onLogin(result.user.displayName || email)
    } catch (err) {
      const errors = {
        'auth/user-not-found': 'الحساب غير موجود',
        'auth/wrong-password': 'كلمة المرور خاطئة',
        'auth/invalid-credential': 'بريد أو كلمة مرور خاطئة',
      }
      setError(errors[err.code] || err.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0e17', fontFamily: 'sans-serif', color: 'white', display: 'flex', flexDirection: 'column', direction: 'rtl' }}>

      {/* Header */}
      <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '14px', cursor: 'pointer', padding: 0 }}>
          → رجوع
        </button>
        {mode === 'register' && (
          <span style={{ color: '#555', fontSize: '13px' }}>
            {step === 1 ? 'الخطوة 1 من 2' : 'الخطوة 2 من 2'}
          </span>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 24px' }}>

        <div style={{ fontSize: '44px', marginBottom: '10px' }}>🎌</div>
        <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>
          {mode === 'login' ? 'تسجيل الدخول' : step === 1 ? 'إنشاء حساب' : 'معلومات إضافية'}
        </h1>
        <p style={{ color: '#555', fontSize: '13px', marginBottom: '28px' }}>
          にほんご<span style={{ color: '#ff6b9d' }}>GO</span>
        </p>

        <div style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* LOGIN MODE */}
          {mode === 'login' && (
            <>
              <div>
                <label style={{ fontSize: '12px', color: '#666', marginBottom: '6px', display: 'block' }}>البريد الإلكتروني</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="example@email.com" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#666', marginBottom: '6px', display: 'block' }}>كلمة المرور</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" style={inputStyle} />
              </div>
            </>
          )}

          {/* REGISTER STEP 1 */}
          {mode === 'register' && step === 1 && (
            <>
              <div>
                <label style={{ fontSize: '12px', color: '#666', marginBottom: '6px', display: 'block' }}>
                  الاسم <span style={{ color: '#ff6b9d' }}>*</span>
                </label>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="اسمك الكامل" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#666', marginBottom: '6px', display: 'block' }}>
                  البريد الإلكتروني <span style={{ color: '#ff6b9d' }}>*</span>
                </label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="example@email.com" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#666', marginBottom: '6px', display: 'block' }}>
                  رقم الهاتف <span style={{ color: '#555', fontSize: '11px' }}>(اختياري)</span>
                </label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="+964 7XX XXX XXXX" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#666', marginBottom: '6px', display: 'block' }}>
                  كلمة المرور <span style={{ color: '#ff6b9d' }}>*</span>
                </label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#666', marginBottom: '6px', display: 'block' }}>
                  إعادة كتابة كلمة المرور <span style={{ color: '#ff6b9d' }}>*</span>
                </label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••" style={inputStyle} />
              </div>
            </>
          )}

          {/* REGISTER STEP 2 */}
          {mode === 'register' && step === 2 && (
            <>
              <div>
                <label style={{ fontSize: '12px', color: '#666', marginBottom: '6px', display: 'block' }}>
                  تاريخ الميلاد <span style={{ color: '#555', fontSize: '11px' }}>(اختياري)</span>
                </label>
                <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                  style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#666', marginBottom: '6px', display: 'block' }}>الدولة</label>
                <select value={country} onChange={e => { setCountry(e.target.value); setCity('') }} style={selectStyle}>
                  <option value="">اختر الدولة</option>
                  {countries.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
              {country && (
                <div>
                  <label style={{ fontSize: '12px', color: '#666', marginBottom: '6px', display: 'block' }}>المحافظة / المدينة</label>
                  <select value={city} onChange={e => setCity(e.target.value)} style={selectStyle}>
                    <option value="">اختر المدينة</option>
                    {selectedCountry?.cities.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {/* Error */}
          {error && (
            <div style={{ background: '#2d0d0d', border: '1px solid #ff6b9d44', borderRadius: '10px', padding: '10px 14px', color: '#ff6b9d', fontSize: '13px', textAlign: 'center' }}>
              {error}
            </div>
          )}

          {/* Buttons */}
          {mode === 'login' && (
            <button onClick={handleLogin} disabled={loading}
              style={{ width: '100%', padding: '16px', background: loading ? '#333' : 'linear-gradient(135deg,#ff6b9d,#c44dff)', border: 'none', borderRadius: '14px', color: 'white', fontSize: '16px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '8px' }}>
              {loading ? 'جاري التحميل...' : 'دخول'}
            </button>
          )}

          {mode === 'register' && step === 1 && (
            <button onClick={() => {
              setError('')
              if (!name.trim()) return setError('الاسم مطلوب')
              if (!email.trim()) return setError('البريد الإلكتروني مطلوب')
              if (!password) return setError('كلمة المرور مطلوبة')
              if (password.length < 6) return setError('كلمة المرور قصيرة جداً')
              if (password !== confirmPassword) return setError('كلمتا المرور غير متطابقتان')
              setStep(2)
            }}
              style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg,#ff6b9d,#c44dff)', border: 'none', borderRadius: '14px', color: 'white', fontSize: '16px', fontWeight: '600', cursor: 'pointer', marginTop: '8px' }}>
              التالي ←
            </button>
          )}

          {mode === 'register' && step === 2 && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setStep(1)}
                style={{ flex: 1, padding: '16px', background: '#1e1e30', border: 'none', borderRadius: '14px', color: '#aaa', fontSize: '15px', cursor: 'pointer' }}>
                → رجوع
              </button>
              <button onClick={handleRegister} disabled={loading}
                style={{ flex: 2, padding: '16px', background: loading ? '#333' : 'linear-gradient(135deg,#ff6b9d,#c44dff)', border: 'none', borderRadius: '14px', color: 'white', fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'جاري الإنشاء...' : 'إنشاء الحساب 🎌'}
              </button>
            </div>
          )}

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0' }}>
            <div style={{ flex: 1, height: '1px', background: '#1e1e30' }} />
            <span style={{ color: '#444', fontSize: '12px' }}>أو</span>
            <div style={{ flex: 1, height: '1px', background: '#1e1e30' }} />
          </div>

          <button onClick={() => onLogin('زائر')}
            style={{ width: '100%', padding: '14px', background: 'none', border: '1px solid #1e1e30', borderRadius: '14px', color: '#aaa', fontSize: '14px', cursor: 'pointer' }}>
            تابع كزائر
          </button>

          <button onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setStep(1); setError('') }}
            style={{ background: 'none', border: 'none', color: '#ff6b9d', fontSize: '13px', cursor: 'pointer', padding: '8px', textAlign: 'center' }}>
            {mode === 'login' ? 'ليس لدي حساب — أنشئ واحد' : 'لدي حساب بالفعل — سجل دخول'}
          </button>
        </div>
      </div>
    </div>
  )
}