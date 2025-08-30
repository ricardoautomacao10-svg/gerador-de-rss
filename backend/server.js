const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

const app = express();
const port = 3000;

// Sua chave da API NewsAPI
const API_KEY = '52765fac5f45400591205d8a82af7bee';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));

// Pasta para armazenar os feeds
const feedsDir = path.join(__dirname, 'feeds');
if (!fs.existsSync(feedsDir)) {
    fs.mkdirSync(feedsDir);
}

// Função para buscar notícias
async function fetchNews(keyword) {
    try {
        const apiUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(keyword)}&language=pt&sortBy=publishedAt&pageSize=20&apiKey=${API_KEY}`;
        const response = await axios.get(apiUrl);
        return response.data.articles;
    } catch (error) {
        console.error('Erro ao buscar notícias:', error.message);
        return [];
    }
}

// Função para gerar RSS
function generateRss(keyword, articles) {
    let rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
    <title>Notícias sobre ${keyword}</title>
    <link>http://localhost:${port}</link>
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

// Função para gerar JSON
function generateJson(keyword, articles) {
    const feed = {
        version: "https://jsonfeed.org/version/1.1",
        title: `Notícias sobre ${keyword}`,
        home_page_url: `http://localhost:${port}`,
        feed_url: `http://localhost:${port}/feed/json/${encodeURIComponent(keyword)}`,
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

// Rota para gerar feed
app.get('/generate-feed', async (req, res) => {
    const { keyword, format } = req.query;
    
    if (!keyword) {
        return res.status(400).json({ error: 'Parâmetro "keyword" é obrigatório' });
    }

    try {
        const articles = await fetchNews(keyword);
        
        if (format === 'rss') {
            const rss = generateRss(keyword, articles);
            // Salvar RSS em arquivo
            const filename = `feed_${encodeURIComponent(keyword)}.rss`;
            fs.writeFileSync(path.join(feedsDir, filename), rss);
            
            res.json({
                message: 'Feed RSS gerado com sucesso',
                url: `http://localhost:${port}/feeds/${filename}`
            });
        } else if (format === 'json') {
            const jsonFeed = generateJson(keyword, articles);
            // Salvar JSON em arquivo
            const filename = `feed_${encodeURIComponent(keyword)}.json`;
            fs.writeFileSync(path.join(feedsDir, filename), JSON.stringify(jsonFeed, null, 2));
            
            res.json({
                message: 'Feed JSON gerado com sucesso',
                url: `http://localhost:${port}/feeds/${filename}`
            });
        } else {
            res.status(400).json({ error: 'Formato inválido. Use "rss" ou "json"' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro ao gerar feed' });
    }
});

// Rota para servir arquivos de feed
app.use('/feeds', express.static(feedsDir));

// Rota para buscar notícias (para o frontend)
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

// Agendador para atualizar feeds a cada hora
cron.schedule('0 * * * *', async () => {
    console.log('Atualizando feeds...');
    
    try {
        const files = fs.readdirSync(feedsDir);
        
        for (const file of files) {
            if (file.endsWith('.rss') || file.endsWith('.json')) {
                // Extrair keyword do nome do arquivo
                const keyword = decodeURIComponent(file.replace(/^(feed_|\.(rss|json)$)/g, ''));
                
                // Buscar notícias atualizadas
                const articles = await fetchNews(keyword);
                
                if (file.endsWith('.rss')) {
                    const rss = generateRss(keyword, articles);
                    fs.writeFileSync(path.join(feedsDir, file), rss);
                } else {
                    const jsonFeed = generateJson(keyword, articles);
                    fs.writeFileSync(path.join(feedsDir, file), JSON.stringify(jsonFeed, null, 2));
                }
                
                console.log(`Feed atualizado: ${keyword}`);
            }
        }
    } catch (error) {
        console.error('Erro ao atualizar feeds:', error);
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});