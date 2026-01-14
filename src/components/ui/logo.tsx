import Image from 'next/image'
import React from 'react'
import { useTranslation } from '../../i18n/languageContext'

export default function Logo() {
    const { t } = useTranslation();
    return (
        <div className="flex gap-2 items-center">
            <Image src="/logo.png" alt="Logo" width={40} height={40} />
            <div className="flex flex-col">
                <span className="font-semibold text-indigo-700 leading-5">
                    {t("common.appName")}
                </span>
                <span className="text-xs text-gray-500 leading-5">
                    {t("common.poweredBy")}
                </span>
            </div>
        </div>
    )
}