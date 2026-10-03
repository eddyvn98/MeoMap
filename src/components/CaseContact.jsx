function contactLink(type, value) {
  if (!value) return null;
  if (type === "phone") {
    return { href: `tel:${value}`, label: `📱 ${value}` };
  }
  if (type === "email") {
    return { href: `mailto:${value}`, label: `✉️ ${value}` };
  }
  if (type === "facebook" && /^https?:\/\//i.test(value)) {
    return { href: value, label: "f Mở Facebook", external: true };
  }
  return null;
}

export default function CaseContact({ pet, owner }) {
  const direct = contactLink(pet?.contact_type, pet?.contact_value);
  const fallback = direct
    ? null
    : owner?.phone
      ? contactLink("phone", owner.phone)
      : null;

  const contact = direct || fallback;

  return (
    <div className="space-y-2 text-sm">
      {owner?.display_name && <div>👤 {owner.display_name}</div>}
      {contact ? (
        <a
          className="block rounded bg-blue-600 px-4 py-2 text-center font-semibold text-white"
          href={contact.href}
          target={contact.external ? "_blank" : undefined}
          rel={contact.external ? "noreferrer" : undefined}
        >
          {contact.label}
        </a>
      ) : (
        <div className="text-gray-600">
          Người đăng chưa cập nhật thông tin liên hệ cho case này.
        </div>
      )}
    </div>
  );
}
