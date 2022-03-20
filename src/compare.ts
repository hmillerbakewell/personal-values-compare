class ComparisonPoset {
    orderings: Map<string, Comparison> = new Map()
    constructor(readonly humanValues: string[], orderings: Map<string, Comparison> = new Map()) {
        this.orderings = copy_map(orderings)
        if ([...orderings.values()].length == 0) {
            this.humanValues.map(v1 => {
                this.humanValues.map(v2 => {
                    this.orderings.set(combine_values(v1, v2), Comparison.Unknown)
                })
            })
        }
    }
    comparison(v1: string, v2: string): Comparison {
        return this.orderings.get(combine_values(v1, v2)) as Comparison
    }
    all_above(v1: string): string[] {
        return this.humanValues.filter(v2 => this.comparison(v2, v1) == Comparison.GreaterThan)
    }
    all_below(v1: string): string[] {
        return this.humanValues.filter(v2 => this.comparison(v1, v2) == Comparison.GreaterThan)
    }
    add_greater_than(higher: string, lower: string): ComparisonPoset {
        let higher_and_above = [higher].concat(this.all_above(higher))
        let lower_and_below = [lower].concat(this.all_below(lower))
        let o = copy_map(this.orderings)
        higher_and_above.map(v1 => {
            lower_and_below.map(v2 => {
                o.set(combine_values(v1, v2), Comparison.GreaterThan)
                o.set(combine_values(v2, v1), Comparison.LessThanOrEqual)
            })
        })

        return new ComparisonPoset(this.humanValues, o)
    }

    supremum(value: string): string {
        let above = this.all_above(value)
        if (above.length > 0) {
            return this.supremum(above[0])
        }
        return value
    }

    print_valid(): string[] {
        return print_assignation(assign_ordering(this))
    }

    num_components(): number {
        return this.suprema().length
    }

    suprema(): string[] {
        return [... new Set(this.humanValues.map(v => this.supremum(v)))]
    }

    estimate_questions_remaining(determine_top_n: number): number {
        // How many questions to connect all components, then fully determine top n
        let questions_to_link_components = this.num_components() - 1

        // Now work out how many questions once we have linked all components

        // Most likely scenario is binary tree
        let determined = this.fully_determined()
        let remaining = Math.max(determine_top_n - determined, 1)
        let questions_to_fill_top_spots_typical = remaining * (remaining - 1) / 2

        let estimate = questions_to_link_components + 1.5 * questions_to_fill_top_spots_typical
        return Math.floor(estimate) + 3 // plus 3 to be on the safe side
    }

    is_determined(value: string): boolean {
        // Fully determined values have comparisons known everywhere, except against themselves
        return this.humanValues.filter(v2 => this.comparison(value, v2) == Comparison.Unknown).length == 1
    }

    fully_determined(): number {
        // Number with no unknown entries (beside themselves)
        return this.humanValues.filter(v => this.is_determined(v)).length
    }

    maximal_top_n(n: number): string[] {
        return this.humanValues.filter(v => this.all_above(v).length < n)
    }

    _max_rating(value: string): number {
        // 0-indexed, 0 means definitely at the top
        // rating of n means there are n definitely above this
        return this.humanValues.filter(v2 => this.comparison(v2, value) == Comparison.GreaterThan).length
    }

    ratings(max: number): RatingInformation[] {

        let qualifying = this.humanValues.filter(v => this._max_rating(v) < max)

        return qualifying.map(v => new RatingInformation(
            v,
            this._max_rating(v),
            qualifying.filter(w => this.comparison(v, w) == Comparison.Unknown && (v != w))
        ))
    }
}

function copy_map<K, V>(ordering: Map<K, V>): Map<K, V> {
    let o: Map<K, V> = new Map();
    [...ordering.keys()].map(k => {
        o.set(k, ordering.get(k) as V)
    })
    return o
}

class RatingInformation {
    constructor(readonly value: string, readonly rating: number, readonly unknown_comparisons: string[]) { }
}

function assign_ordering(poset: ComparisonPoset): Map<string, number> {
    let assignation = new Map<string, number>()
    poset.humanValues.map(value => assignation.set(value, Math.random()))
    let missmatch = function (): Boolean {
        // Need to check that if a > b in the poset then a > b in the assignation
        for (let value of poset.humanValues) {
            let below = poset.all_below(value)
            let biggest_below = Math.max(...below.map(v => assignation.get(v) as Comparison))
            if (assignation.get(value) as Comparison <= biggest_below) {
                return true
            }
        }
        return false
    }
    let counter = 0
    let max = 100
    while (missmatch() && counter < max) {
        for (let value of poset.humanValues) {
            let below = poset.all_below(value)
            let biggest_below = Math.max(...below.map(v => assignation.get(v) as number))
            if (assignation.get(value) as number <= biggest_below) {
                assignation.set(value, biggest_below + (1 - biggest_below) * Math.random())
            }
        }
        counter++
    }
    if (counter == max) {
        throw new Error("Timeout")
    }
    return assignation
}

function print_assignation(assignation: Map<string, number>): string[] {
    let values = [...assignation.keys()].sort((a, b) => (assignation.get(a) as number) - (assignation.get(b) as number))
    return values
}

function combine_values(v1: string, v2: string): string {
    return v1 + "::" + v2
}

enum Comparison {
    GreaterThan = 1, LessThanOrEqual = -1, Unknown = 0
}

function flip_comparison(comparison: Comparison): Comparison {
    switch (comparison) {
        case Comparison.GreaterThan:
            return Comparison.LessThanOrEqual
        case Comparison.LessThanOrEqual:
            return Comparison.GreaterThan
        case Comparison.Unknown:
            return Comparison.Unknown
    }
}


let Definitions = {
    "Adventure": "Finding new excitements",
    "Appearance": "Beauty, presence, and fashion",
    "Challenge": "Pushing yourself, regardless of the goal",
    "Community": "Being part of a large group",
    "Curiosity": "Encountering new ideas",
    "Cooking": "Preparing food in your own home",
    "Dancing": "Alone or with others",
    "Emotional Independence": "Your mood is not reliant on the actions of others",
    "Exercise": "Things you do to keep fit",
    "Faith": "Connection to something beyond humanity",
    "Family": "Regular connection with family",
    "Fresh Air": "Access to a clean environment",
    "Friendship": "Deep relationships within a small group",
    "Games": "Boardgames, cards, computer games, etc.",
    "Giving Gifts": "Finding or making gifts for others",
    "Helping Others": "Charity work or acts of service",
    "Learning": "Amassing knowledge and skills",
    "Love": "Finding people to share your heart with",
    "Peace": "Quiet surroundings or internal peace",
    "Pets": "Having pets at home",
    "Performing Arts": "Music, theatre, etc.",
    "Physical Independence": "Living without routine assistance",
    "Quiet Hobbies": "Occupied moments of calm",
    "Religion": "The routine, structure, and community, as opposed to Faith",
    "Reputation": "The things strangers might know you for",
    "Responsibility": "Being trusted by others",
    "Stability": "Confidence that next week will be like this week",
    "Sport": "Watching or taking part in",
    "Treats": "Indulging yourself",
    "Visual Arts and Crafts": "Creating or admiring",
    "Work": "Fulfilling employment",
}

let Values: string[] = []
for (let key in Definitions) {
    Values.push(key)
}

class ValuesGame {
    poset_history: ComparisonPoset[] = []
    comparison_history: [string, string][] = []
    poset() {
        // Top one is always most recent
        return this.poset_history[0]
    }
    constructor(readonly max_interest: number) {
        this.poset_history.push(new ComparisonPoset(Values))
    }
    of_interest(): [boolean, string[]] {
        let poset = this.poset()
        let suprema = poset.suprema()
        if (suprema.length > 1) {
            let first_choice = rFrom(suprema.map(v => [v, 1]))
            let second_choice = rFrom(suprema.filter(v => v != first_choice).map(v => [v, 1]))
            return [true, [first_choice, second_choice]]
        }

        let rating_info = this.poset().ratings(this.max_interest)
        let valid_competition = rating_info.filter(ri => ri.unknown_comparisons.length > 0)
        if (valid_competition.length == 0) {
            return [false, []]
        }

        let first_choice = rFrom(valid_competition.map(v => [v, 1 / (1 + v.rating)]))
        let second_choice = rFrom(first_choice.unknown_comparisons.map(v => [v, 1 / (1 + this.poset()._max_rating(v))]))
        return [true, [first_choice.value, second_choice]]
    }
    choose(v1: string, v2: string): void {
        this.poset_history.unshift(this.poset().add_greater_than(v1, v2))
        this.comparison_history.unshift([v1, v2])
        this.suggest()
    }
    suggest(): void {
        clear_choice_div()
        let pair = this.of_interest()
        if (pair[0] != false) {
            draw_choice(pair[1][0], pair[1][1])
            draw_estimate(this.poset().estimate_questions_remaining(this.max_interest))
        } else {
            draw_assignment(this.poset().print_valid().reverse().slice(0, this.max_interest))
            hide_estimate()
        }
        draw_history(this.comparison_history)
    }
    undo(): void {
        if (this.poset_history.length > 1) {
            this.poset_history.shift()
            this.comparison_history.shift()
            hide_assignment()
        }
        this.suggest()
    }
    remaining(): number {
        return this.poset().estimate_questions_remaining(this.max_interest)
    }
}

function clear_history() {
    let div = document.getElementById("history")
    div!.innerHTML = ""
}

function draw_history(comparisons: [string, string][]) {
    clear_history()

    let div = document.getElementById("history")
    if (comparisons.length > 0) {

        let label = document.createElement("div")
        let undoButton = document.createElement("button")
        undoButton.addEventListener("click", ev => {
            VG.undo()
        })
        undoButton.innerText = "Undo Last"
        label.appendChild(undoButton)
        label.classList.add("three-wide")
        div!.appendChild(label)
        comparisons.forEach(c => {
            let cp1 = document.createElement("div")
            let cp2 = document.createElement("div")
            let cp3 = document.createElement("div")

            cp1.innerText = c[0]
            cp2.textContent = ">"
            cp3.innerText = c[1]

            div!.appendChild(cp1)
            div!.appendChild(cp2)
            div!.appendChild(cp3)
        })
    }
}

function clear_choice_div() {
    let div = document.getElementById("comparisons")
    div!.innerHTML = ""
}


function hide_estimate() {
    let div = document.getElementById("estimate")
    div!.classList.add("invisible")
    div!.innerHTML = ""
}

function draw_estimate(estimate: number) {
    let div = document.getElementById("estimate")
    div!.classList.remove("invisible")
    let estimate_text = estimate.toString()
    if (estimate < 10) {
        estimate_text = "Under 10"
    }
    div!.innerHTML = `Estimated questions remaining: ${estimate_text}`
}



function hide_assignment() {
    let div = document.getElementById("assignment")
    div!.classList.add("invisible")
    div!.innerHTML = ""
}

function draw_assignment(values: string[]) {
    let div = document.getElementById("assignment")
    div!.classList.remove("invisible")
    div!.innerHTML = `<h1>Your top values, ranked</h1>` + values.map(v => `<div class='valueReport'><h2>${v}</h2><p>${(Definitions as any)[v]}</p></div>`).join("\n")
}

function rFrom<T>(weighted: [T, number][]): T {
    let total = (weighted.map(v => v[1])).reduce((a, b) => a + b)
    let r = Math.random() * total
    while (r > 0) {
        let popped = weighted.pop() as [T, number]
        r -= popped[1]
        if (r < 0) {
            return popped[0]
        }
    }
    // Should never reach here
    throw new Error("Weighted list was empty")
}

function draw_choice(v1: string, v2: string) {
    let div = document.getElementById("comparisons")
    function button(v: string, w: string): HTMLElement {
        let b = document.createElement("button")
        b.innerText = v
        b.addEventListener("click", ev => {
            VG.choose(v, w)
        })
        return b
    }

    function mini_label(v: string): HTMLElement {
        let d = document.createElement("div")
        d.innerText = (Definitions as any)[v]
        d.classList.add("definition")
        return d
    }
    let label = document.createElement("h1")
    label.classList.add("header")
    label.classList.add("two-wide")
    label.innerHTML = "Which is more important to you?"
    let explanation = document.createElement("div")
    explanation.classList.add("header")
    explanation.classList.add("two-wide")
    explanation.innerHTML = "Thinking about what you want from your day-to-day life"
    clear_choice_div()
    div!.appendChild(label)
    div!.appendChild(explanation)
    div!.appendChild(button(v1, v2))
    div!.appendChild(button(v2, v1))
    div!.appendChild(mini_label(v1))
    div!.appendChild(mini_label(v2))
}

let VG = new ValuesGame(5)
function start() {
    VG.suggest()
}