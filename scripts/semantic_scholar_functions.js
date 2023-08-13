const paper_fields = "fields=title,authors,abstract,externalIds,year,publicationVenue,citationCount"
async function getPaper(paper_id) {
    const request = `https://api.semanticscholar.org/graph/v1/paper/${paper_id}?${paper_fields}`;
    const response = await fetchJson(request);
    return parsePaper(response)
}

async function searchPapers(searchPhrase) {
    const query = searchPhrase.replace(/ /g, '+');
    
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${query}&${paper_fields}`;
    let papers = []
    try {
        const response = await fetchJson(url);
        
        for (const paperJson of response["data"].slice(0, 50)) {
            papers.push(parsePaper(paperJson));
        }
    } catch (e) {
        console.error(`Failed to fetch ${url}: ${e.message}`);
        console.error(e);
    }
    return papers
}


async function fetchJson(url) {
    try {
        const headers = {
            'x-api-key': 'HsrUTKcDTS9KYV4HmROMC1brviGjw5Bc4nPUqBNY'
        };

        const response = await fetch(url, { headers: headers });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Failed to fetch JSON from ${url}: ${error.message}`);
        throw error;
    }
}

function getLink(paperJson) {
    if (paperJson["externalIds"]) {
        if (paperJson["externalIds"]["ArXiv"]) {
            const arxivId = paperJson["externalIds"]["ArXiv"];
            return `https://arxiv.org/abs/${arxivId}`;
        }
    }
    return null;
}

function parsePaper(paperJson) {
    return {
        id: paperJson["paperId"],
        link: getLink(paperJson), 
        title: paperJson["title"],
        abstract: paperJson["abstract"],
        authorNames: paperJson["authors"].map(author => author["name"]),
        authorIds: paperJson["authors"].map(author => author["authorId"]),
        year: paperJson["paper"],
        publicationVenue: (paperJson["publicationVenue"] || {})["name"],
        citationCount: paperJson["citationCount"],
        summary: null
    };
}

async function getRelatedPapers(paper, exploredAuthors) {
    const relatedPapers = [];

    async function fetchAndAppend(url, paperKey, message) {
        try {
            const response = await fetchJson(url);
            console.log(`${response['data'].length} ${message}`);
            
            for (const datum of response["data"].slice(0, 50)) {
                const paperJson = datum[paperKey];
                relatedPapers.push(parsePaper(paperJson));
            }
        } catch (e) {
            console.error(`Failed to fetch ${message}: ${e.message}`);
        }
    }

    async function fetchAndAppendAuthor(authorId, authorName) {
        try {
            const authorRequest = `https://api.semanticscholar.org/graph/v1/author/${authorId}?fields=papers.title,papers.abstract,papers.authors,papers.externalIds,papers.year,papers.publicationVenue,papers.citationCount`;
            const response = await fetchJson(authorRequest);
            console.log(`${response['papers'].length} by ${authorName}`);
            
            for (const paperJson of response["papers"].slice(0, 50)) {
                relatedPapers.push(parsePaper(paperJson));
            }
        } catch (e) {
            console.error(`Failed to fetch papers by author ${authorName}: ${e.message}`);
        }
    }

    // Retrieve citing papers
    const citationsRequest = `https://api.semanticscholar.org/graph/v1/paper/${paper.id}/citations?${paper_fields}`;
    await fetchAndAppend(citationsRequest, "citingPaper", "citing papers");

    // Retrieve referenced papers
    const referencesRequest = `https://api.semanticscholar.org/graph/v1/paper/${paper.id}/references?${paper_fields}`;
    await fetchAndAppend(referencesRequest, "citedPaper", "referenced papers");

    // Retrieve papers by shared authors
    for (let i = 0; i < paper.authorIds.length; i++) {
        const authorId = paper.authorIds[i];
        const authorName = paper.authorNames[i];

        if (!exploredAuthors.has(authorId)) {
            exploredAuthors.add(authorId);
            await fetchAndAppendAuthor(authorId, authorName);
        }
    }

    return relatedPapers;
}
