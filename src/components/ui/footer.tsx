import { useTranslation } from '../../i18n/languageContext';

export default function Footer({ className }: { className?: string }) {
	const { t } = useTranslation();
	return (
		<footer className={`text-xs py-3 text-center ${className || 'bg-white'}`}>
			{t("layout.footer").replace(
				"{{year}}",
				String(new Date().getFullYear())
			)}
		</footer>
	)
}
