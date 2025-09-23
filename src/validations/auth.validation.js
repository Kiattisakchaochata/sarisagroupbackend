import * as yup from 'yup'

export const registerSchema = yup.object({
  name: yup.string().required('กรุณาระบุชื่อ'),
  email: yup.string().email('รูปแบบอีเมลไม่ถูกต้อง').required('กรุณาระบุอีเมล'),
  password: yup.string().min(6, 'รหัสผ่านต้องมากกว่า 6 ตัวอักษร').required('กรุณาระบุรหัสผ่าน')
})

export const loginSchema = yup.object({
  email: yup.string().email('รูปแบบอีเมลไม่ถูกต้อง').required('กรุณาระบุอีเมล'),
  password: yup.string().required('กรุณาระบุรหัสผ่าน')
})