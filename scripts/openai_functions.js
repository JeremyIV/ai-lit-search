// Utility function to send a question to OpenAI's GPT-3.5 Turbo
async function askOpenAI(prompt, model, apiKey) {
    const requestData = {
        "model": model,
        "messages": [{ "role": "user", "content": prompt }]
    };
    let data;
    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestData)
        });

        data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error(`Failed to call OpenAI API: ${error.message}`);
        console.error(data);
        throw error;
    }
}


function getDecisionFromResponse(responseText, keywords) {
    for (let keyword of keywords) {
        if (responseText.toLowerCase().includes(keyword.toLowerCase())) {
            return keyword;
        }
    }
    return null;
}

function getListFromResponse(responseText) {
    let pattern = /\[.*?\]/s;
    // find the first match in the string
    let match = responseText.match(pattern);
    if (match) {
        // convert the JSON list to a JavaScript array
        try {
            let jsArray = JSON.parse(match[0]);
            return jsArray;
        } catch (e) {
            console.error('Error parsing JSON:', e);
            return null;
        }
    } else {
        return null;
    }
}

function get_authors_string(authorNames){
    if (authorNames === undefined) {
        return "N/A"
    } else {
        return authorNames.join(", ")
    }
}

function truncateTitle(title) {
    const maxLength = 100;
    const cutOffLength = 97;
    
    if (title.length <= maxLength) {
        return title;
    }
    
    let truncated = title.slice(0, cutOffLength);
    truncated = truncated.slice(0, truncated.lastIndexOf(' ')) + '...';
    
    return truncated;
}

function getPaperDescription(paper) {
    return `
    Title: ${paper.title}
    Authors: ${get_authors_string(paper.authorNames)}
    citations: ${paper.citationCount}
    year: ${paper.year}
    Abstract: ${paper.abstract}
    `
}

async function getMostRelevantPaper(papers, prompt, model, apiKey) {
    // Each paper in papers has a string-valued attribute "title".
    // TODO: include year, citations in the prompt
    const papers_by_title = {}; 
    const titles = papers.map(paper => {
        const truncatedTitle = truncateTitle(paper.title);
        papers_by_title[truncatedTitle] = paper;
        return truncatedTitle;
    });
    const titlesString = titles.join('\n');

    const chatgptPrompt = `Given the following research prompt:

\`\`\`
${prompt}
\`\`\`

And the following paper titles:
\`\`\`

${titlesString}
\`\`\`

Pick a title which sounds the most relevant to the research prompt.
Please respond with only the title, exactly as it appears in the list.
Don't bother responding with anything else, as your response will just be parsed by a simple script.`;
    console.log(chatgptPrompt)
    try {
        const responseText = await askOpenAI(chatgptPrompt, model, apiKey);
        console.log(responseText);

        const options = {
            includeScore: true,
            threshold: 0.4,
            location: 0,
            distance: 100,
            maxPatternLength: 300,
            minMatchCharLength: 1,
            keys: ["title"]
        };

        const fuse = new Fuse(papers, options);
        const results = fuse.search(responseText);
        
        let paper;
        if (results.length > 0) {
            paper = results[0].item;
        } else {
            console.log("Failed to match paper, returning the first title in the list");
            paper = papers[0];  // Fallback to the first paper
        }

        return paper;
    } catch (error) {
        console.error(`Failed to compare relevance: ${error.message}`);
        throw error;  // Or handle this in another way if you prefer
    }
}


async function getSearchKeywords(prompt, model, apiKey) {
    // TODO
    // ask GPT to generate a list of search keywords for the given research prompt
    // then parse that list and return it.
        const chatgptPrompt = `Given the following research prompt:

\`\`\`
${prompt}
\`\`\`

what are some search queries which would be a good starting point for finding papers which are relevant to the research prompt?
produce search queries, possibly containing many words, designed to be entered into a keyword-based academic literature search.
Please respond with a JSON list of keyword search queries, e.g. ["machine learning", "artificial intelligence"]`;

    try {
        const responseText = await askOpenAI(chatgptPrompt, model, apiKey);
        console.log(responseText)
        const searchList = getListFromResponse(responseText)
        if (!searchList) {
            throw new Error(`Badly formatted ChatGPT response: ${responseText}`);
        }
        return searchList
    } catch (error) {
        console.error(`Failed to compare relevance: ${error.message}`);
        throw error;  // Or handle this in another way if you prefer
    }
}


async function isMoreRelevant(paperA, paperB, prompt, model, apiKey) {
    const chatgptPrompt = `Given the following research prompt:

\`\`\`
${prompt}
\`\`\`

And These summaries of the following two papers:

Paper A:
${getPaperDescription(paperA)}

Paper B:
${getPaperDescription(paperB)}

Which paper is more relevant to the prompt?
Simply respond "Paper A" or "Paper B". Don't bother responding with anything else, your response will be parsed by a simple regex script which just finds the first occurrence of one of these two phrases.`;

    console.log(chatgptPrompt);
    try {
        const responseText = await askOpenAI(chatgptPrompt, model, apiKey);
        console.log(responseText);
        const decision = getDecisionFromResponse(responseText, ["paper a", "paper b"]);
        if (!decision) {
            throw new Error(`Badly formatted ChatGPT response: ${responseText}`);
        }
        return decision === "Paper A";
    } catch (error) {
        console.error(`Failed to compare relevance: ${error.message}`);
        throw error;  // Or handle this in another way if you prefer
    }
}

async function isRelevant(paper, prompt, model, apiKey) {
    // TODO: include year, citations, publication venue in the prompt
    const chatgptPrompt = `Given the following research prompt:

\`\`\`
${prompt}
\`\`\`

Does this paper appear relevant to the user's research interests?

${getPaperDescription(paper)}

Simply respond "yes" or "no". Don't bother responding with anything else, your response will be parsed by a simple regex script which just finds the first occurrence of one of these two words.`;

    console.log(chatgptPrompt);

    try {
        const responseText = await askOpenAI(chatgptPrompt, model, apiKey);
        console.log(responseText);
        const decision = getDecisionFromResponse(responseText, ["yes", "no"]);
        if (!decision) {
            throw new Error(`Badly formatted ChatGPT response: ${responseText}`);
        }
        return decision === "yes";
    } catch (error) {
        console.error(`Failed to check relevance: ${error.message}`);
        throw error;  // Or handle this in another way if you prefer
    }
}

async function summarize(paper, prompt, model, apiKey) {
    const chatgptPrompt = `Given the following research prompt:

\`\`\`
${prompt}
\`\`\`

And the following paper abstract:

${getPaperDescription(paper)}

Give a brief (one paragraph) summary of the paper and its relevance to the prompt.
Also discuss how it differs from, or is not relevant to, the prompt.
You do not need to include the paper title, authors, year, or citation count in the summary.
The goal of this summary is to be as useful as possible for assessing the relevance of this paper.`;

    try {
        const responseText = await askOpenAI(chatgptPrompt, model, apiKey);
        paper.summary = responseText; 
        return paper;
    } catch (error) {
        console.error(`Failed to summarize: ${error.message}`);
        throw error;  // Or handle this in another way if you prefer
    }
}
