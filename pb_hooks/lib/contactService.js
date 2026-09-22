var rateLimitMap = {}

function isRateLimited(ip) {
  if (!ip || ip === "unknown" || ip === "127.0.0.1" || ip === "::1" || ip.indexOf("127.0.0.1") !== -1) {
    return false
  }

  var now = Date.now()
  var windowMs = 10 * 60 * 1000
  var maxRequests = 5

  if (!rateLimitMap[ip]) {
    rateLimitMap[ip] = []
  }

  rateLimitMap[ip] = rateLimitMap[ip].filter(function (timestamp) {
    return now - timestamp < windowMs
  })

  if (rateLimitMap[ip].length >= maxRequests) {
    return true
  }

  rateLimitMap[ip].push(now)
  return false
}

function escapeHtml(str) {
  if (!str) {
    return ""
  }
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

var levelLabels = {
  inicial: "Nivel Inicial (Jardín)",
  primario: "Nivel Primario"
}

function submit(c) {
  var data = {}
  try {
    var info = $apis.requestInfo(c)
    data = info.data || {}
  } catch (err) {
    try {
      var body = new DynamicModel({})
      c.bind(body)
      data = JSON.parse(JSON.stringify(body))
    } catch (e2) {
      return c.json(400, { ok: false, message: "Error al leer datos: " + String(e2) })
    }
  }

  if (data._hp && String(data._hp).trim().length > 0) {
    return c.json(200, { ok: true, message: "Consulta recibida." })
  }

  var clientIp = "unknown"
  try {
    if (c.realIP) {
      clientIp = c.realIP()
    } else if (c.request() && c.request().remoteAddr) {
      clientIp = c.request().remoteAddr
    }
  } catch (ipError) {}

  if (isRateLimited(clientIp)) {
    return c.json(429, {
      ok: false,
      message: "Demasiadas solicitudes enviadas. Por favor, intentá nuevamente más tarde."
    })
  }

  var nombre = String(data.nombre || "").trim()
  var email = String(data.email || "").trim()
  var telefono = String(data.telefono || "").trim()
  var nivel = String(data.nivel || "").trim().toLowerCase()
  var mensaje = String(data.mensaje || "").trim()

  if (nombre.length < 2 || nombre.length > 100) {
    return c.json(400, {
      ok: false,
      message: "El nombre y apellido debe tener entre 2 y 100 caracteres."
    })
  }

  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email || email.length > 100 || !emailRegex.test(email)) {
    return c.json(400, {
      ok: false,
      message: "El correo electrónico ingresado no es válido."
    })
  }

  if (telefono.length > 40) {
    return c.json(400, {
      ok: false,
      message: "El teléfono no puede superar los 40 caracteres."
    })
  }

  if (!levelLabels[nivel]) {
    return c.json(400, {
      ok: false,
      message: "El nivel de interés seleccionado no es válido."
    })
  }

  if (mensaje.length < 5 || mensaje.length > 2000) {
    return c.json(400, {
      ok: false,
      message: "La consulta debe tener entre 5 y 2000 caracteres."
    })
  }

  var nivelLabel = levelLabels[nivel]
  var fechaHora = new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC"

  var htmlBody =
    '<div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">' +
    '<div style="background: #1d4ed8; padding: 24px; text-align: center; color: #ffffff;">' +
    '<h2 style="margin: 0; font-size: 20px; letter-spacing: 0.5px;">CONSULTA RECIBIDA VÍA SITIO WEB</h2>' +
    '<p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Colegio Crecer y Ser (A-1134)</p>' +
    '</div>' +
    '<div style="padding: 24px; background: #ffffff;">' +
    '<h3 style="margin-top: 0; color: #0f172a; font-size: 16px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">Datos de Contacto</h3>' +
    '<table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">' +
    '<tr><td style="padding: 8px 0; font-weight: bold; width: 160px; color: #64748b;">Nombre y Apellido:</td><td style="padding: 8px 0; color: #0f172a;">' + escapeHtml(nombre) + '</td></tr>' +
    '<tr><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Correo Electrónico:</td><td style="padding: 8px 0;"><a href="mailto:' + escapeHtml(email) + '" style="color: #1d4ed8; text-decoration: none;">' + escapeHtml(email) + '</a></td></tr>' +
    '<tr><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Teléfono / WhatsApp:</td><td style="padding: 8px 0; color: #0f172a;">' + escapeHtml(telefono || "-") + '</td></tr>' +
    '<tr><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Nivel de Interés:</td><td style="padding: 8px 0; color: #0f172a; font-weight: bold;">' + escapeHtml(nivelLabel) + '</td></tr>' +
    '<tr><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Fecha y Hora:</td><td style="padding: 8px 0; color: #64748b;">' + fechaHora + '</td></tr>' +
    '</table>' +
    '<h3 style="color: #0f172a; font-size: 16px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">Consulta</h3>' +
    '<div style="background: #f8fafc; border-left: 4px solid #1d4ed8; padding: 16px; border-radius: 4px; font-size: 14px; white-space: pre-wrap; color: #334155;">' +
    escapeHtml(mensaje) +
    '</div>' +
    '</div>' +
    '<div style="background: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">' +
    'Mensaje enviado desde el formulario web de admisiones. Respondé directamente a este correo para comunicarte con ' + escapeHtml(nombre) + '.' +
    '</div>' +
    '</div>'

  var textBody =
    "======================================================\n" +
    "CONSULTA RECIBIDA VÍA SITIO WEB\n" +
    "Colegio Crecer y Ser (A-1134)\n" +
    "======================================================\n\n" +
    "DATOS DE CONTACTO:\n" +
    "- Nombre y Apellido:  " + nombre + "\n" +
    "- Correo Electrónico: " + email + "\n" +
    "- Teléfono / WhatsApp: " + (telefono || "-") + "\n" +
    "- Nivel de Interés:   " + nivelLabel + "\n" +
    "- Fecha y Hora:       " + fechaHora + "\n\n" +
    "CONSULTA:\n" +
    "------------------------------------------------------\n" +
    mensaje + "\n" +
    "------------------------------------------------------\n\n" +
    "Podés responder directamente a este correo para escribirle a " + nombre + " (" + email + ").\n"

  var senderAddress = $app.settings().meta.senderAddress || "secretariacreceryser@gmail.com"
  var senderName = $app.settings().meta.senderName || "Colegio Crecer y Ser"
  var destinationEmail = "secretariacreceryser@gmail.com"

  var mail = new MailerMessage({
    from: {
      address: senderAddress,
      name: senderName
    },
    to: [{ address: destinationEmail }],
    replyTo: [{ address: email, name: nombre }],
    subject: "[Consulta Web] " + nivelLabel + " - " + nombre,
    html: htmlBody,
    text: textBody
  })

  try {
    $app.newMailClient().send(mail)
  } catch (error) {
    return c.json(500, {
      ok: false,
      message: "No se pudo enviar el correo en este momento. Por favor, intentá nuevamente más tarde o comunicate telefónicamente."
    })
  }

  return c.json(200, {
    ok: true,
    message: "Tu consulta ha sido enviada con éxito. Nos pondremos en contacto a la brevedad."
  })
}

module.exports = {
  submit: submit
}
