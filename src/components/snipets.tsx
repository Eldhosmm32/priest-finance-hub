import { toast } from "sonner"

export const snipet = () => {
    return (
        <div>
            {
                toast.error("A salary entry already exists for this priest in the selected month.", {
                    position: "top-center",
                    style: {
                        backgroundColor: "#f87171",
                        color: "#fff",
                    },
                })
            }
        </div>
    )
}