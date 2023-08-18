
async function getInsertionIndex(sortedList, item, comesEarlier) {
    let low = 0, high = sortedList.length;

    while (low < high) {
        let mid = Math.floor((low + high) / 2);
        console.log("About to call comesEarlier")
        console.log(sortedList)
        console.log(mid)
        if (await comesEarlier(item, sortedList[mid])) {
            high = mid;
        } else {
            low = mid + 1;
        }
    }

    return low;
}
RUNNING = true;

async function stop() {
    RUNNING=false;
}

async function searchLiterature() {
    RUNNING = true;
    const apiKey = document.getElementById("apiKey").value;
    const model = document.getElementById("modelChoice").value;
    const researchTopic = document.getElementById("researchTopic").value;
    // Log statements
    console.log("API Key:", apiKey);
    console.log("Model Choice:", model);
    console.log("Research Topic:", researchTopic);
    //console.log("Starting Papers:", startingPaperIds);

    async function _getMostRelevantPaper(papers) {
        return await getMostRelevantPaper(papers, researchTopic, model, apiKey);
    }

    let paper_ids = new Set();
    let tournamentTree = new TournamentTree(20, _getMostRelevantPaper);
    let foundPapers = []
    let exploredAuthors = new Set(); // Updated to Set

    function addToTournamentTree(paper) {
        if (!paper_ids.has(paper.id)) {
            paper_ids.add(paper.id);
            tournamentTree.push(paper);
        }
    }
    // Start the literature search process with a some keyword searches
    const searchPhrases = await getSearchKeywords(researchTopic, model, apiKey)
    for (let searchPhrase of searchPhrases) {
        for (let paper of await searchPapers(searchPhrase)){
            addToTournamentTree(paper);
        }
    }

    async function moreRelevant(a, b) {
        return await isMoreRelevant(a, b, researchTopic, model, apiKey)
    }
    async function ShowPaper(paper) {
        const insertionIndex = await getInsertionIndex(foundPapers, paper, moreRelevant);
        let card = displayResult(paper, insertionIndex); 
        foundPapers.splice(
            insertionIndex,
            0,
            paper
        );
        return card;
    }

    async function addSummary(paper, card) {
        await summarize(paper, prompt, model, apiKey);
        let cardBody = card.querySelector('div.card-body');
        console.log('card body');
        console.log(cardBody);
        
        summaryTitle = document.createElement('h6');
        summaryTitle.textContent = 'Summary';
        cardBody.appendChild(summaryTitle);
        
        const summaryText = document.createElement('p');
        summaryText.className = 'card-text';
        summaryText.textContent = paper.summary;
        cardBody.appendChild(summaryText);
    }

    let paper;
    while ((paper = await tournamentTree.pop()) && RUNNING) {
        if (await isRelevant(paper, researchTopic, model, apiKey)) {
            // summarize it, add it to found papers
            let card = await ShowPaper(paper);
            //addSummary(paper, card);
            for (let relatedPaper of await getRelatedPapers(paper, exploredAuthors)) {
                addToTournamentTree(relatedPaper);
            }
        }
    }
}

function displayResult(paper, insertionIndex) {
    const resultsContainer = document.getElementById('resultsContainer');
    
    const card = document.createElement('div');
    card.className = 'card mt-3 result';

    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';

    // Title link
    const cardTitleLink = document.createElement('a');
    cardTitleLink.href = paper.link;
    cardTitleLink.target = '_blank';
    cardTitleLink.style.textDecoration = 'none';  // optional

    const cardTitle = document.createElement('h5');
    cardTitle.className = 'card-title';
    cardTitle.textContent = paper.title;

    cardTitleLink.appendChild(cardTitle);

    const cardSubtitle = document.createElement('h6');
    cardSubtitle.className = 'card-subtitle mb-2 text-muted';
    cardSubtitle.textContent = paper.authorNames.join(', ');


    // Collapsible section for the abstract using Bootstrap

    // Button for the collapsible section
    const abstractButton = document.createElement('a');
    abstractButton.className = 'btn btn-link text-decoration-none';
    abstractButton.setAttribute('data-bs-toggle', 'collapse');
    abstractButton.setAttribute('data-bs-target', `#abstract-${paper.id}`);
    abstractButton.textContent = 'View Abstract ';
    
    // Optional: Add a down icon using FontAwesome
    const downIcon = document.createElement('i');
    downIcon.className = 'fas fa-chevron-down';  // Assuming you're using FontAwesome
    abstractButton.appendChild(downIcon);

    // Collapsible content
    const abstractCollapse = document.createElement('div');
    abstractCollapse.className = 'collapse mt-2';
    abstractCollapse.id = `abstract-${paper.id}`;

    const abstractText = document.createElement('p');
    abstractText.className = 'card-text';
    abstractText.textContent = paper.abstract;

    abstractCollapse.appendChild(abstractText);

    // Appending elements to the card
    cardBody.appendChild(cardTitleLink);
    cardBody.appendChild(cardSubtitle);
    if (paper.year) {
        const yearElement = document.createElement('p');
        yearElement.textContent = `Year: ${paper.year}`;
        cardBody.appendChild(yearElement);
    }

    if (paper.publicationVenue) {
        const venueElement = document.createElement('p');
        venueElement.textContent = `Publication Venue: ${paper.publicationVenue}`;
        cardBody.appendChild(venueElement);
    }

    if (paper.citationCount || paper.citationCount === 0) { // Checking for 0 as well, in case it's a valid count
        const citationElement = document.createElement('p');
        citationElement.textContent = `Citations: ${paper.citationCount}`;
        cardBody.appendChild(citationElement);
    }
    cardBody.appendChild(abstractButton);
    cardBody.appendChild(abstractText);
    
    card.appendChild(cardBody);

    // Insert card into the results container
    if (insertionIndex >= resultsContainer.childNodes.length) {
        resultsContainer.appendChild(card);
    } else {
        resultsContainer.insertBefore(card, resultsContainer.childNodes[insertionIndex]);
    }

    return card;
}
