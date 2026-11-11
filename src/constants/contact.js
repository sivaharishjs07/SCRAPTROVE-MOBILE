// Scrap Trove support contact details, in one place. These are the values
// the app already used on the suspended-account, Yard Finds and bulk
// products screens; previously each screen had its own copy, and the
// dealer-pending screen pointed at a placeholder number (919999999999).
// TODO(client): confirm dealer applicants should use this same line.

// WhatsApp (wa.me) number: country code + number, digits only.
export const SUPPORT_WHATSAPP = '917603807955';

// Phone number for tel: links.
export const SUPPORT_PHONE = '+917603807955';

export const SUPPORT_EMAIL = 'support@scraptrove.com';

// wa.me link with a pre-filled message.
export const supportWhatsAppUrl = (message) =>
  `https://wa.me/${SUPPORT_WHATSAPP}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
