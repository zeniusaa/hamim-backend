// asyncHandler — pembungkus controller async.
// Controller cukup fokus ke logic; error apa pun otomatis di-pass ke
// next(err) → errorHandler. Ini satu-satunya gaya yang dipakai sekarang
// (sebelumnya campur: sebagian try/catch manual, sebagian next(err)).
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

module.exports = asyncHandler
