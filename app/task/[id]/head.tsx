interface Props {
  params: Promise<{ id: string }>;
}

export default async function Head({ params }: Props) {
  const { id } = await params;

  return (
    <>
      <title>Task {id} – Blueprintly</title>
      <meta
        name="description"
        content="View an implementation task generated from your architecture documentation in Blueprintly."
      />
    </>
  );
}

