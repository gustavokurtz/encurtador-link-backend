const express = require('express');
const { PrismaClient } = require('@prisma/client');
const shortid = require('shortid');
const validUrl = require('valid-url');

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

app.post('/encurtar', async (req, res) => {
  const { originalUrl } = req.body;

  // Validação da URL
  if (!validUrl.isUri(originalUrl)) {
    return res.status(400).json({ error: 'URL inválida' });
  }

  try {
    // Verifica se a URL já foi encurtada
    let url = await prisma.url.findFirst({ where: { originalUrl } });
    if (url) return res.json(url); // Retorna a URL existente

    // Cria o encurtador com a URL completa
    const shortUrl = `${req.protocol}://${req.get('host')}/${shortid.generate()}`;

    // Salva no banco
    url = await prisma.url.create({
      data: {
        originalUrl,
        shortUrl,
      },
    });

    // Retorna o resultado
    res.json(url);
  } catch (error) {
    res.status(500).json({ error: 'Erro no servidor' });
  }
});


app.get('/', async (req, res) => {
  try {
    // Busca todas as URLs no banco de dados
    const data = await prisma.url.findMany();

    // Mapeia os dados para adicionar o domínio completo à URL encurtada
    const urls = data.map((url) => ({
      ...url,
      shortUrl: `${req.protocol}://${req.get('host')}/${url.shortUrl.split('/').pop()}`, // Adiciona protocolo e host
    }));

    // Retorna as URLs formatadas
    res.json(urls);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar URLs' });
  }
});







// Redirecionar pela URL encurtada
app.get('/:shortUrl', async (req, res) => {
  try {
    const url = await prisma.url.findFirst({
      where: {
        shortUrl: {
          endsWith: req.params.shortUrl, // Busca apenas pelo identificador curto
        },
      },
    });
    if (url) {
      await prisma.url.update({
        where: { id: url.id },
        data: { clicks: url.clicks + 1 },
      });
      return res.redirect(url.originalUrl);
    } else {
      res.status(404).json({ error: 'URL não encontrada' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
