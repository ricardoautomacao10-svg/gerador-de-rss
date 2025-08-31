// server.js (Versão Corrigida)

const express = require('express');
const axios = require('axios');
const cors =require('cors');
require('dotenv').config(); // Adicione esta linha no topo para carregar variáveis de ambiente

const app = express();
// Use a porta do ambiente de produção ou 3000 para desenvolvimento
const port = process.env.PORT || 3000; 

// Sua chave da API NewsAPI (agora vinda de um arquivo .env)
const API_KEY = process.env.NEWS_API_KEY;

// Middleware
app.use(cors());
app.use(express.json());

// Função para buscar notícias (sem alterações)
async function fetchNews(keyword) {
    if (!API_KEY) {
        console.error('Chave da API não encontrada. Crie um arquivo .env com NEWS_API_KEY.');
        return [];
    }
    try {
        const apiUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(keyword)}&language=pt&sortBy=publishedAt&pageSize=20&apiKey=${API_KEY}`;
        const response = await axios.get(apiUrl);
        return response.data.articles;
    } catch (error) {
        console.error('Erro ao buscar notícias:', error.message);
        return [];
    }
}

// Funções para gerar RSS e JSON (sem alterações)
function generateRss(keyword, articles) {
    // ... seu código original aqui ...
    // Apenas mude o <link> para o URL público do seu app quando for hospedar
    let rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
    <title>Notícias sobre ${keyword}</title>
    <link>URL_DO_SEU_SITE_AQUI</link>
    <description>Feed de notícias sobre ${keyword}</description>
    <language>pt-br</language>`;

    articles.forEach(article => {
        if (!article.title || article.title === '[Removed]') return;

        rss += `
    <item>
        <title>${escapeXml(article.title)}</title>
        <link>${article.url}</link>
        <description>${escapeXml(article.description || '')}</description>
        <pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate>
        <source url="${article.url}">${escapeXml(article.source.name || 'Fonte')}</source>
    </item>`;
    });

    rss += `
</channel>
</rss>`;

    return rss;
}

function generateJson(keyword, articles) {
    // ... seu código original aqui ...
     const feed = {
        version: "https://jsonfeed.org/version/1.1",
        title: `Notícias sobre ${keyword}`,
        home_page_url: `URL_DO_SEU_SITE_AQUI`,
        feed_url: `URL_DO_SEU_SITE_AQUI/feed/json/${encodeURIComponent(keyword)}`,
        description: `Feed de notícias sobre ${keyword}`,
        items: articles.map(article => {
            if (!article.title || article.title === '[Removed]') return null;

            return {
                id: article.url,
                url: article.url,
                title: article.title,
                content_text: article.description,
                date_published: article.publishedAt,
                image: article.urlToImage,
                author: article.source.name
            };
        }).filter(item => item !== null)
    };
    return feed;
}

function escapeXml(unsafe) {
    // ... seu código original aqui ...
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}

// ===== NOVA ROTA DINÂMICA =====
app.get('/feed/:format/:keyword', async (req, res) => {
    const { format, keyword } = req.params;
    const { limit } = req.query; // Pega o limite da query string

    if (!keyword) {
        return res.status(400).send('Parâmetro "keyword" é obrigatório');
    }

    try {
        const articles = await fetchNews(keyword);
        const limitedArticles = limit ? articles.slice(0, parseInt(limit, 10)) : articles;

        if (format === 'rss') {
            const rssContent = generateRss(keyword, limitedArticles);
            res.header('Content-Type', 'application/rss+xml');
            res.send(rssContent);
        } else if (format === 'json') {
            const jsonContent = generateJson(keyword, limitedArticles);
            res.header('Content-Type', 'application/json');
            res.json(jsonContent);
        } else {
            res.status(400).send('Formato inválido. Use "rss" ou "json".');
        }
    } catch (error) {
        res.status(500).send('Erro ao gerar o feed.');
    }
});


app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
