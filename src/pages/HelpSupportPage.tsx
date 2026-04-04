import { ArrowLeft, Mail, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PHONE = "9415505471";
const EMAIL = "sahgalclasses@gmail.com";
const WHATSAPP_URL = "https://wa.me/919415505471";

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const HelpSupportPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-20 bg-background">
      <div className="bg-primary px-4 py-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10">
            <ArrowLeft size={22} className="text-primary-foreground" />
          </button>
          <h1 className="text-base font-bold text-primary-foreground">Help &amp; Support</h1>
        </div>
      </div>

      <div className="px-4 mt-5 space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          SAHGAL CLASSES is here to help. Reach us by phone, email, or WhatsApp.
        </p>

        <a
          href={`tel:+91${PHONE}`}
          className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm active:scale-[0.99] transition-transform"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Phone size={22} className="text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mobile</p>
            <p className="text-base font-semibold text-foreground">+91 {PHONE}</p>
          </div>
        </a>

        <a
          href={`mailto:${EMAIL}`}
          className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm active:scale-[0.99] transition-transform"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Mail size={22} className="text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</p>
            <p className="text-sm font-semibold text-foreground break-all">{EMAIL}</p>
          </div>
        </a>

        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 rounded-xl border border-emerald-600/30 bg-emerald-50 p-4 shadow-sm active:scale-[0.99] transition-transform"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#25D366] text-white">
            <WhatsAppIcon className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">WhatsApp</p>
            <p className="text-base font-semibold text-foreground">Chat with us</p>
            <p className="text-xs text-muted-foreground mt-0.5">Opens WhatsApp with +91 {PHONE}</p>
          </div>
        </a>
      </div>
    </div>
  );
};

export default HelpSupportPage;
