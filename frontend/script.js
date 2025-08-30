document.addEventListener('DOMContentLoaded', function() {
    const newsContainer = document.getElementById('news-container');
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');
    const generateBtn = document.getElementById('generate-btn');
    const feedUrlSection = document.getElementById('feed-url-section');
    const feedUrlInput = document.getElementById('feed-url');
    const copyBtn = document.getElementById('copy-btn');
    const formatRadios = document.querySelectorAll('input[name="feed-format"]');
    
    let currentNews = [];
    let currentKeyword = '';
    let currentFormat = 'rss';
    
    // Event listeners para formatos
    formatRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            currentFormat = radio.value;
        });
    });
    
    // Função para buscar notícias
    async function fetchNews(keyword) {
        newsContainer.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Buscando notícias para: ${keyword}...</p>
            </div>
        `;
        
        try {
            const response = await fetch(`http://localhost:3000/news?keyword=${encodeURIComponent(keyword)}`);
            
            if (!response.ok) {
                throw new Error('Falha ao carregar notícias');
            }
            
            const articles = await response.json();
            
            if (articles && articles.length > 0) {
                currentNews = articles;
                displayNews(currentNews);
            } else {
                throw new Error('Nenhuma notícia encontrada para esta palavra-chave');
            }
        } catch (error) {
            console.error(error);
            newsContainer.innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }
    
    // Função para gerar feed
    async function generateFeed(keyword, format) {
        try {
            const response = await fetch(`http://localhost:3000/generate-feed?keyword=${encodeURIComponent(keyword)}&format=${format}`);
            
            if (!response.ok) {
                throw new Error('Falha ao gerar feed');
            }
            
            const result = await response.json();
            return result.url;
        } catch (error) {
            console.error(error);
            throw new Error('Erro ao gerar feed');
        }
    }
    
    // Função para exibir notícias
    function displayNews(articles) {
        let newsHTML = '';
        
        articles.forEach(article => {
            if (!article.title || article.title === '[Removed]') return;
            
            newsHTML += `
                <div class="news-card">
                    <img src="${article.urlToImage || 'https://placehold.co/600x400/0061ff/white?text=Tech+News'}" 
                         alt="${article.title}" class="news-image">
                    <div class="news-content">
                        <div class="news-source">
                            <span class="source-name">${article.source.name || 'Fonte'}</span>
                            <span class="news-date">${new Date(article.publishedAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <h3 class="news-title">${article.title}</h3>
                        <p class="news-description">${article.description || 'Clique em "Leia mais" para ver a notícia completa.'}</p>
                        <a href="${article.url}" target="_blank" class="read-more">Leia mais <i class="fas fa-arrow-right"></i></a>
                    </div>
                </div>
            `;
        });
        
        if (newsHTML === '') {
            newsContainer.innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Nenhuma notícia disponível no momento. Tente outra palavra-chave.</p>
                </div>
            `;
        } else {
            newsContainer.innerHTML = `<div class="news-grid">${newsHTML}</div>`;
        }
    }
    
    // Event listeners
    searchBtn.addEventListener('click', () => {
        const keyword = searchInput.value.trim();
        if (keyword) {
            currentKeyword = keyword;
            fetchNews(keyword);
        }
    });
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const keyword = searchInput.value.trim();
            if (keyword) {
                currentKeyword = keyword;
                fetchNews(keyword);
            }
        }
    });
    
    generateBtn.addEventListener('click', async () => {
        const keyword = searchInput.value.trim();
        if (keyword) {
            currentKeyword = keyword;
            
            try {
                const feedUrl = await generateFeed(keyword, currentFormat);
                feedUrlInput.value = feedUrl;
                feedUrlSection.style.display = 'block';
                
                // Buscar notícias para exibir
                fetchNews(keyword);
            } catch (error) {
                alert(error.message);
            }
        } else {
            alert('Por favor, digite uma palavra-chave primeiro');
        }
    });
    
    copyBtn.addEventListener('click', () => {
        feedUrlInput.select();
        document.execCommand('copy');
        alert('URL copiada para a área de transferência!');
    });
});