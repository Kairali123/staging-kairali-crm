import { redirect } from "next/navigation";

interface Props {
    searchParams: { tab?: string };
}

export default function VoiceDataPage({ searchParams }: Props) {
    if (searchParams.tab === "received") {
        redirect("/voicecall/data/received");
    }
    redirect("/voicecall/data/sent");
}