import { redirect } from "next/navigation";

interface Props {
    searchParams: Promise<{ tab?: string }>;
}

export default async function VoiceDataPage({ searchParams }: Props) {
    const resolvedSearchParams = await searchParams;
    if (resolvedSearchParams.tab === "received") {
        redirect("/voicecall/data/received");
    }
    redirect("/voicecall/data/sent");
}
