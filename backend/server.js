const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Sua chave da API NewsAPI (agora vinda de um arquivo .env)
const API_KEY = process.env.NEWS_API_KEY;

// Middleware
app.use(cors());
app.use(express.json());

// Função para buscar notícias na NewsAPI
async function fetchNews(keyword) {
    if (!API_KEY) {
        console.error('ERRO: Chave da API (NEWS_API_KEY) não encontrada no arquivo .env.');
        return [];
    }
    try {
        const apiUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(keyword)}&language=pt&sortBy=publishedAt&pageSize=20&apiKey=${API_KEY}`;
        const response = await axios.get(apiUrl);
        return response.data.articles;
    } catch (error) {
        console.error('ERRO ao buscar notícias:', error.message);
        return [];
    }
}

// Função para gerar RSS a partir dos artigos
function generateRss(keyword, articles) {
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

// Função para gerar JSON a partir dos artigos
function generateJson(keyword, articles) {
    const feed = {
        version: "https://jsonfeed.org/version/1.1",
        title: `Notícias sobre ${keyword}`,
        home_page_url: `URL_DO_SEU_SITE_AQUI`,
        feed_url: `URL_DO_SEU_SITE_AQUI/feed/${encodeURIComponent(keyword)}`,
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

// Função auxiliar para escape de XML
function escapeXml(unsafe) {
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

// Rota para gerar feeds dinamicamente
app.get('/feed/:format/:keyword', async (req, res) => {
    const { format, keyword } = req.params;
    const { limit } = req.query;

    if (!keyword) {
        return res.status(400).send('Parâmetro "keyword" é obrigatório.');
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

// A sua rota original para o front-end também foi simplificada
app.get('/news', async (req, res) => {
    const { keyword } = req.query;
    if (!keyword) {
        return res.status(400).json({ error: 'Parâmetro "keyword" é obrigatório' });
    }
    try {
        const articles = await fetchNews(keyword);
        res.json(articles);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar notícias' });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
