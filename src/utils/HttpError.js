// HttpError — error custom yang membawa status code HTTP.
// Gaya konsisten untuk SEMUA controller: lempar HttpError di service/controller,
// biarkan errorHandler (middleware terakhir) yang menerjemahkan ke response.
// Tidak perlu try/catch manual + error(res, ...) di tiap controller lagi.
class HttpError extends Error {
  constructor(message, statusCode = 400, code = undefined) {
    super(message)
    this.statusCode = statusCode
    if (code) this.code = code
  }
}

module.exports = HttpError
