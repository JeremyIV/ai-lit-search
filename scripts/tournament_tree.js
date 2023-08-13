class Node {
    constructor(value, children = []) {
        this.value = value;
        this.children = children;
    }
}

class TournamentTree {
    constructor(n, findMax) {
        this.subtrees = [];
        this.n = n;
        this.findMax = findMax;
    }

    push(element) {
        this.subtrees.push(new Node(element, []));
    }

    async pop() {
        let tournamentTree = await this._run_tournament();
        if (!tournamentTree) return null;
        
        let winner = tournamentTree.value;
        this.subtrees = this._get_branches(tournamentTree);
        return winner;
    }

    async _run_tournament() {
        if (this.subtrees.length === 0) {
            return null;
        }

        while (this.subtrees.length > 1) {
            const numGames = Math.ceil(this.subtrees.length / this.n);
            let games = Array.from({ length: numGames }, () => []);
            for (let index in this.subtrees) {
                let subtree = this.subtrees[index];
                let gameIndex = index % numGames;
                games[gameIndex].push(subtree);
            }

            // Use Promise.all to parallelize the findMax calls
            let winners = await Promise.all(
                games.map(async (competitors) => {
                    let winnerValue = await this.findMax(competitors.map(c => c.value));
                    return competitors.find(c => c.value === winnerValue);
                })
            );

            let nextSubtrees = winners.map((winningNode, idx) => new Node(winningNode.value, games[idx]));

            this.subtrees = nextSubtrees;
        }
        return this.subtrees[0];
    }


    _get_branches(trunk) {
        let branches = [];
        for (let branch of trunk.children) {
            if (branch.value === trunk.value) {
                branches = branches.concat(this._get_branches(branch));
            } else {
                branches.push(branch);
            }
        }
        return branches;
    }

}

function findMax(arr) {
    // Your function to find the max element in an array
    return Math.max(...arr);
}

/// TEST CODE

async function runTests() {
    // Test 1: Initialize the queue and push elements
    let pq = new TournamentTree(3, findMax);
    pq.push(5);
    pq.push(15);
    pq.push(10);
    pq.push(20);
    pq.push(25);

    // Test 2: Pop elements and check order
    assert(await pq.pop() === 25, "Test 1: First pop should return 25");
    pq.push(30);
    pq.push(45);
    pq.push(40);
    assert(await pq.pop() === 45, "Test 2: Pop should return 45");
    assert(await pq.pop() === 40, "Test 2: Pop should return 40");
    assert(await pq.pop() === 30, "Test 2: Pop should return 30");
    assert(await pq.pop() === 20, "Test 2: Pop should return 20");
    assert(await pq.pop() === 15, "Test 2: Pop should return 15");
    assert(await pq.pop() === 10, "Test 2: Pop should return 10");

    // Test 3: Push more elements and check
    pq.push(3);
    pq.push(8);
    pq.push(30);
    assert(await pq.pop() === 30, "Test 3: Pop should return 30");
    assert(await pq.pop() === 8, "Test 3: Pop should return 8");
    assert(await pq.pop() === 5, "Test 4: Pop should return 5");
    assert(await pq.pop() === 3, "Test 4: Pop should return 3");
    assert(await pq.pop() === null, "Test 4: Pop on empty queue should return null");

    console.log("All tests passed!");
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

// Call the runTests function
runTests().catch(error => {
    console.error("An error occurred:", error);
});
