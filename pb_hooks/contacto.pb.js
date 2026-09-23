routerAdd("POST", "/api/cys/contacto", (c) => {
  const contact = require(`${__hooks}/lib/contactService.js`)
  return contact.submit(c)
}, $apis.bodyLimit(16384))
