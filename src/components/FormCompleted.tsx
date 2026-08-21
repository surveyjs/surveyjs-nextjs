import { Button } from "@/components/ui/button";

export function FormCompleted({
  message,
  onEdit,
}: {
  message: string;
  onEdit: () => void;
}) {
  return (
    <div className="border p-6">
      <p className="font-semibold">{message}</p>
      <Button className="mt-4" onClick={onEdit}>
        Edit Response
      </Button>
    </div>
  );
}
