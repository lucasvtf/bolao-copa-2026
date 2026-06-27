export async function getCanal(client, envName) {
  const id = process.env[envName];
  if (!id) {
    console.warn(`[canais] ${envName} não definido — pulando post`);
    return null;
  }
  try {
    const canal = await client.channels.fetch(id);
    if (!canal?.isSendable?.()) {
      console.warn(`[canais] canal ${envName}=${id} não é enviável`);
      return null;
    }
    return canal;
  } catch (err) {
    console.warn(`[canais] falha ao buscar ${envName}=${id}: ${err.message}`);
    return null;
  }
}
