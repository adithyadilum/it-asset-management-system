import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const statCards = [
    { title: "Registered Assets", value: "4,128" },
    { title: "Assigned Today", value: "27" },
    { title: "Pending Repairs", value: "14" },
]

export default function DashboardPage() {
    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
                {statCards.map((card) => (
                    <Card key={card.title} className="border-slate-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-muted-foreground">
                                {card.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-semibold text-foreground">{card.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle>Asset Health Snapshot</CardTitle>
                </CardHeader>
                <CardContent className="h-56" />
            </Card>
        </div>
    )
}
