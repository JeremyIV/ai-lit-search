
async function getInsertionIndex(sortedList, item, comesEarlier) {
    let low = 0, high = sortedList.length;

    while (low < high) {
        let mid = Math.floor((low + high) / 2);
        if (await comesEarlier(item, sortedList[mid]['paper'])) {
            high = mid;
        } else {
            low = mid + 1;
        }
    }

    return low;
}


async function searchLiterature() {
    const apiKey = document.getElementById("apiKey").value;
    const model = document.getElementById("modelChoice").value;
    const researchTopic = document.getElementById("researchTopic").value;
    const maxPapers = parseInt(document.getElementById("maxResults").value);
    // Log statements
    console.log("API Key:", apiKey);
    console.log("Model Choice:", model);
    console.log("Research Topic:", researchTopic);
    //console.log("Starting Papers:", startingPaperIds);

    let checkedPapers = new Set(); // Updated to Set
    let foundPapers = [];
    let exploredAuthors = new Set(); // Updated to Set
    const maxRelatedPapers = 100; // Not used currently

    async function moreRelevant(a, b) {
        return await isMoreRelevant(a, b, researchTopic, model, apiKey) // Updated function name
    }

    async function addIfRelevant(paper) {
        if (checkedPapers.has(paper.id)) {
            return;
        }
        checkedPapers.add(paper.id);

        if (await isRelevant(paper, researchTopic, model, apiKey)) { // isRelevant function needs to be defined or imported
            await summarize(paper, researchTopic, model, apiKey); // summarize function needs to be defined or imported
            console.log(`Adding ${paper.title}`);
            console.log(paper)
            const insertionIndex = await getInsertionIndex(foundPapers, paper, moreRelevant); // This function needs to be defined or imported
            displayResult(paper, insertionIndex); // This function needs to be defined or imported
            foundPapers.splice(
                insertionIndex,
                0,
                {  
                    explored: false,
                    paper: paper
                }
            );
            // TODO: trim foundPapers and the list of cards to only contain the top n papers.
            foundPapers = foundPapers.slice(0, maxPapers);
            dropResultsAfter(maxPapers);
        } else {
            console.log(`skipping irrelevant paper: ${paper.title}`)
        }
    }

    // Start the literature search process with a some keyword searches
    const searchPhrases = await getSearchKeywords(researchTopic, model, apiKey)
    for (let searchPhrase of searchPhrases) {
        for (let paper of await searchPapers(searchPhrase)){
            await addIfRelevant(paper);
        }
    }

    // for (paperId of startingPaperIds) {
    //     // Assuming the paperId is the trimmed line as per the logic.
    //     // Call getPaper(paperId) to get the paper.
    //     const paper = await getPaper(paperId);

    //     // Add the paper's id to checkedPapers.
    //     checkedPapers.add(paper.id);

    //     // Call summarize for the paper.
    //     await summarize(paper, researchTopic, model, apiKey);

    //     // Add the following object to foundPapers.
    //     foundPapers.push({
    //         'explored': false,
    //         'paper': paper
    //     });
    //     displayResult(paper, foundPapers.length)
    // }

    function getNextUnexploredPaper(){
        for (let paperObj of foundPapers) { // Updated variable name
            if (!paperObj.explored) {
                paperObj.explored = true; // Fixed the access to the property
                return paperObj.paper;
            }
        }
        return null;
    }

    let paper = getNextUnexploredPaper();
    while (paper && (foundPapers.length <= maxPapers)) { // Updated to use .length
        console.log(`Searching papers related to ${paper.title}`);
        let relatedPapers = await getRelatedPapers(paper, exploredAuthors); // This function needs to be defined or imported

        for (let relatedPaper of relatedPapers) {
            await addIfRelevant(relatedPaper);
        }
        paper = getNextUnexploredPaper();
    }
}

function dropResultsAfter(n) {
    // Select the parent container
    let container = document.getElementById('resultsContainer');

    // Get all child div elements
    let childDivs = container.querySelectorAll('div.result');

    // Loop through child divs in reverse and remove the ones after the nth div
    for (let i = childDivs.length - 1; i >= n; i--) {
        container.removeChild(childDivs[i]);
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

    const summaryText = document.createElement('p');
    summaryText.className = 'card-text';
    summaryText.textContent = paper.summary;


    // Appending elements to the card
    cardBody.appendChild(cardTitleLink);
    cardBody.appendChild(cardSubtitle);
    cardBody.appendChild(abstractButton);
    cardBody.appendChild(abstractCollapse);
    cardBody.appendChild(summaryText);
    card.appendChild(cardBody);

    // Insert card into the results container
    if (insertionIndex >= resultsContainer.childNodes.length) {
        resultsContainer.appendChild(card);
    } else {
        resultsContainer.insertBefore(card, resultsContainer.childNodes[insertionIndex]);
    }
}
