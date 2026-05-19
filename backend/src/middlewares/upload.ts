import multer from 'multer'
import { AppError } from './errorHandler'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
const MAX_SIZE_MB = 10

export const upload = multer({
  storage: multer.memoryStorage(), // armazena em memória — não salva em disco
  limits: {
    fileSize: MAX_SIZE_MB * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(
        new AppError(
          `Formato não suportado. Use PNG, JPG, JPEG ou WEBP.`,
          422,
          'UNSUPPORTED_FILE_TYPE'
        )
      )
    }
    cb(null, true)
  },
})
