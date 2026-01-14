
import Image from 'next/image';
import { useTranslation } from '../../i18n/languageContext';

export default function Loader() {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col gap-2 items-center justify-center bg-gradient-to-b from-[#f3e7e9] to-[#e3eeff] rounded-lg p-4 min-h-[calc(100vh-9.5rem)]">
            <Image src="/logo.png" alt="Logo" width={100} height={100} />
            <span className="text-lg font-semibold text-gray-800">{t("common.loading")}</span>
        </div >
    )
}