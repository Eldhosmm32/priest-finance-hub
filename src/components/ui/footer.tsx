import { useTranslation } from '../../i18n/languageContext';

export default function Footer() {
    const { t } = useTranslation();
    return (
        <footer className="text-xs text-gray-500 py-3 text-center bg-gray-50/50 backdrop-blur-sm">
            {t("layout.footer").replace(
                "{{year}}",
                String(new Date().getFullYear())
            )}
        </footer>
    )
}