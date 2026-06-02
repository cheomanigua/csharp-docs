// Initialize Mermaid with a clean theme
mermaid.initialize({ 
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose'
});

async function loadDoc() {
    const contentArea = document.getElementById('main-content');
    
    // Parse page and anchor from double-hash (e.g., #deploy#environment-variables)
    const fullHash = window.location.hash.replace('#', '');
    const hashParts = fullHash.split('#');
    
    const page = hashParts[0] || 'enums_flags';
    const anchorId = hashParts[1]; 

    try {
        const response = await fetch(`docs/${page}.md`);
        if (!response.ok) throw new Error('File not found');
        
        let text = await response.text();

        // 1. Process Custom Callouts ([!INFO], [!TIP], etc.)
        text = parseCallouts(text);

        // 2. Render Markdown to HTML
        contentArea.innerHTML = (typeof marked.parse === 'function') 
            ? marked.parse(text) 
            : marked.marked(text);

        // 3. Fix Mermaid Diagrams
        const mermaidBlocks = contentArea.querySelectorAll('pre code.language-mermaid');
        mermaidBlocks.forEach((codeBlock, index) => {
            const rawCode = codeBlock.textContent;
            const diagramDiv = document.createElement('div');
            diagramDiv.className = 'mermaid';
            diagramDiv.id = `mermaid-${index}`;
            diagramDiv.textContent = rawCode;
            
            const preElement = codeBlock.parentElement;
            preElement.parentNode.replaceChild(diagramDiv, preElement);
        });

        // 4. Trigger Rendering Libraries
        if (window.mermaid) {
            mermaid.run();
        }
        
        if (window.Prism) {
            Prism.highlightAllUnder(contentArea);
        }

        // 5. Update UI Components
        generateToC(contentArea);
        updateSidebarLinks(page);

        // 6. Scroll to element if an anchor exists in the URL
        if (anchorId) {
            scrollToAnchor(anchorId);
        }

    } catch (err) {
        console.error(err);
        contentArea.innerHTML = "<h1>404</h1><p>Documentation page not found.</p>";
    }
}

// Helper to handle smooth scrolling to an ID
function scrollToAnchor(id) {
    const element = document.getElementById(id);
    if (element) {
        // Small delay ensures Mermaid/Prism layout shifts are finished
        setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth' });
        }, 150);
    }
}

function parseCallouts(text) {
    const calloutRegex = /\[!(INFO|WARNING|DANGER|SUCCESS|NOTE|TIP)\]([\s\S]*?)(?=\n\n|$)/gi;

    return text.replace(calloutRegex, (match, type, content) => {
        const lowerType = type.toLowerCase();
        const cleanContent = content.trim().replace(/\n/g, '<br>');
        return `<div class="callout ${lowerType}">${cleanContent}</div>`;
    });
}

function generateToC(container) {
    const tocList = document.getElementById('toc-list');
    if (!tocList) return;
    tocList.innerHTML = '';

    const headers = Array.from(container.querySelectorAll('h1, h2'));
    const subHeaders = headers.slice(1); 

    subHeaders.forEach((header) => {
        const id = header.innerText.toLowerCase().replace(/\s+/g, '-');
        header.id = id;

        const li = document.createElement('li');
        const a = document.createElement('a');
        
        // TOC links keep the page context to prevent routing issues
        const pagePart = window.location.hash.replace('#', '').split('#')[0] || 'enums_flags';
        a.href = `#${pagePart}#${id}`;
        a.innerText = header.innerText;
        
        if (header.tagName === 'H2') a.style.paddingLeft = "15px";

        a.onclick = (e) => {
            e.preventDefault();
            scrollToAnchor(id);
            history.pushState(null, null, `#${pagePart}#${id}`);
        };

        li.appendChild(a);
        tocList.appendChild(li);
    });
}

function updateSidebarLinks(currentPage) {
    document.querySelectorAll('.sidebar a').forEach(link => {
        const href = link.getAttribute('href').replace('#', '');
        link.classList.toggle('active', href === currentPage);
    });
}

// Event Listeners
window.addEventListener('hashchange', () => {
    const fullHash = window.location.hash.replace('#', '');
    const hashParts = fullHash.split('#');
    const newPage = hashParts[0] || 'enums_flags';
    const anchorId = hashParts[1];

    // Only reload the file if the page part of the hash has actually changed
    if (window.lastLoadedPage !== newPage) {
        window.lastLoadedPage = newPage;
        loadDoc();
    } else if (anchorId) {
        // If on the same page, just scroll to the target
        scrollToAnchor(anchorId);
    }
});

// Click interceptor to handle re-clicking the exact same anchor URL
document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && link.getAttribute('href') && link.getAttribute('href').startsWith('#')) {
        const fullHash = link.getAttribute('href').replace('#', '');
        const hashParts = fullHash.split('#');
        const anchorId = hashParts.length > 1 ? hashParts[1] : hashParts[0];

        if (window.location.hash === link.getAttribute('href')) {
            scrollToAnchor(anchorId);
        }
    }
}, true);

window.addEventListener('DOMContentLoaded', () => {
    const fullHash = window.location.hash.replace('#', '');
    window.lastLoadedPage = fullHash.split('#')[0] || 'enums_flags';
    loadDoc();
});
