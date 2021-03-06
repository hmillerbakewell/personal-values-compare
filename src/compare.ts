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
        // strategy: accurate measure for the top level
        // then a heuristic for the rest

        let completed = this.fully_determined()

        let next_level = this.maximal_top_n(completed + 1).length - completed

        // How many questions to connect all components, then fully determine top n
        let questions_to_link_components = next_level - 1

        // Estimate how many questions once we have linked this next round of components
        let estimate_future_rounds = Math.log(this.humanValues.length - 1) * Math.max(0, determine_top_n - completed - 1)

        return Math.ceil(questions_to_link_components + estimate_future_rounds)
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



enum Categories {
    Relationships = "Relationships",
    Environment = "Environment",
    Hobbies = "Hobbies",
    Career = "Career",
    LongTerm = "LongTerm",
    Community = "Community"
}


class PersonalValue {
    constructor(readonly shortName: string, readonly description: string, readonly categories: Categories[]) { }
}


let AllValues: PersonalValue[] = [
    new PersonalValue("Acknowledgement", "Have your opinions heard", [Categories.Career]),
    new PersonalValue("Adventure", "Finding new excitements", [Categories.LongTerm]),
    new PersonalValue("Appearance", "How you look", [Categories.Hobbies]),
    new PersonalValue("Bustle", "Always having something going on", [Categories.Environment]),
    new PersonalValue("Challenge", "Pushing yourself, regardless of the goal", [Categories.LongTerm]),
    new PersonalValue("Community", "Being part of a large group", [Categories.Community]),
    new PersonalValue("Curiosity", "Encountering new ideas", [Categories.LongTerm]),
    new PersonalValue("Cooking", "Preparing food in your own home", [Categories.Environment, Categories.Hobbies]),
    new PersonalValue("Dancing", "Structured or doing your own thing", [Categories.Hobbies]),
    new PersonalValue("Exercise", "Things you do to keep fit, but not competitive", [Categories.Hobbies]),
    new PersonalValue("Faith", "Connection to something beyond humanity", [Categories.Community]),
    new PersonalValue("Family", "Regular connection with family", [Categories.Relationships, Categories.Community]),
    new PersonalValue("Fresh Air", "Access to a clean environment", [Categories.Environment]),
    new PersonalValue("Friendship", "Deep relationships within a small group", [Categories.Relationships]),
    new PersonalValue("Games", "Boardgames, cards, computer games, etc.", [Categories.Hobbies]),
    new PersonalValue("Gardening", "A place and the time to grow plants", [Categories.Hobbies, Categories.Environment]),
    new PersonalValue("Giving Gifts", "Finding or making gifts for others", [Categories.Hobbies, Categories.Relationships]),
    new PersonalValue("Growth", "Knowing you are changing and adapting", [Categories.LongTerm, Categories.Career]),
    new PersonalValue("Helping Others", "Working to help those around you", [Categories.Career]),
    new PersonalValue("Leadership", "People look to you for guidance", [Categories.Career]),
    new PersonalValue("Learning", "Amassing knowledge and skills", [Categories.Hobbies]),
    new PersonalValue("Love", "Finding people to share your heart with", [Categories.Relationships]),
    new PersonalValue("Peace", "Calm, tranquillity, silence", [Categories.Environment]),
    new PersonalValue("Pets", "Having pets at home", [Categories.Environment, Categories.Relationships]),
    new PersonalValue("Performing Arts", "Music, theatre, etc.", [Categories.Hobbies]),
    new PersonalValue("Politics", "Serving the public", [Categories.Career]),
    new PersonalValue("Physical Independence", "Living without routine assistance", [Categories.Environment]),
    new PersonalValue("Quality Time", "Being with friends or loved ones, no matter the activity", [Categories.Hobbies]),
    new PersonalValue("Literature", "Reading and writing", [Categories.Hobbies]),
    new PersonalValue("Religion", "The routine, structure, and community, as opposed to Faith", [Categories.Community]),
    new PersonalValue("Reputation", "The things strangers might know you for", [Categories.Career]),
    new PersonalValue("Responsibility", "Being trusted by others", [Categories.Career]),
    new PersonalValue("Stability", "Confidence that next week will be like this week", [Categories.LongTerm, Categories.Environment]),
    new PersonalValue("Status", "The higher up the ladder the better", [Categories.Career]),
    new PersonalValue("Sport", "Competitive exercise", [Categories.Hobbies]),
    new PersonalValue("Visual Arts and Crafts", "Creating and admiring", [Categories.Hobbies]),
    new PersonalValue("Wealth", "Beyond financial stability", [Categories.Career]),
]

function values_by_category(categories: Categories[]): string[] {
    let set_of_categories = new Set(categories)
    let should_include = (pv: PersonalValue) => pv.categories.filter(i => set_of_categories.has(i)).length > 0

    return AllValues.filter(should_include).map(pv => pv.shortName)
}

let Definitions: any = {}
AllValues.forEach(pv => { Definitions[pv.shortName] = pv.description })

function markdown_all_values(): string {
    let by_category = new Map<Categories, PersonalValue[]>()
    AllValues.forEach(pv => {
        pv.categories.forEach(c => by_category.set(c, []))
    })
    AllValues.forEach(pv => {
        pv.categories.forEach(c => (by_category.get(c) as PersonalValue[]).push(pv))
    })
    let s = ""
    for (let cat of [...by_category.keys()].sort()) {
        let pvs = by_category.get(cat) as PersonalValue[]
        s += category_long_name(cat) + ":\n\n"
        pvs.map(pv => pv.shortName).sort().forEach(short => s += " - " + short + ": " + Definitions[short] + "\n")
        s += "\n"
    }
    return s
}

function category_long_name(category: Categories): string {
    switch (category) {
        case Categories.Career:
            return "Career"
        case Categories.Hobbies:
            return "Hobbies"
        case Categories.Environment:
            return "Home Environment"
        case Categories.LongTerm:
            return "Long Term Attitudes"
        case Categories.Relationships:
            return "Relationships and Faith"
        case Categories.Community:
            return "Community and Faith"
    }
}

class ValuesGame {
    poset_history: ComparisonPoset[] = []
    comparison_history: [string, string][] = []
    poset() {
        // Top one is always most recent
        return this.poset_history[0]
    }
    constructor(readonly max_interest: number, readonly categories: Categories[]) {
        this.poset_history.push(new ComparisonPoset(values_by_category(categories)))
    }
    of_interest(): [boolean, string[]] {
        let poset = this.poset()
        let sorted = poset.fully_determined()

        if (sorted < this.max_interest) {
            let next_level = poset.maximal_top_n(sorted + 1).filter(v => !poset.is_determined(v))



            if (next_level.length > 1) {
                let first_choice = rFrom(next_level.map(v => [v, 1]))
                let second_choice = rFrom(next_level.filter(v => v != first_choice).map(v => [v, 1]))
                return [true, [first_choice, second_choice]]
            }
        }
        return [false, []]
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
        undoButton.classList.add("undo-button")
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
        //estimate_text = "Under 10"
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
        b.classList.add("values")
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
    label.innerHTML = "Which is more important?"
    clear_choice_div()
    div!.appendChild(label)
    div!.appendChild(button(v1, v2))
    div!.appendChild(button(v2, v1))
    div!.appendChild(mini_label(v1))
    div!.appendChild(mini_label(v2))
}

let VG: ValuesGame
function start() {
    let max_and_categories = read_GET()
    let categories = max_and_categories[1]
    let max_to_determine = max_and_categories[0]
    VG = new ValuesGame(max_to_determine, categories)
    VG.suggest()
}

let read_GET = function (): [number, Categories[]] {
    let break_at_question_mark = window.location.toString().split(/\?/)
    let all_categories = Object.keys(Categories).filter(k => Number.isNaN(+k)) as Categories[];
    if (break_at_question_mark.length == 1) {
        return [5, all_categories]
    }
    let instructions = break_at_question_mark[1]
    let max_to_find = 5
    let categories_to_include = all_categories
    instructions.split("&").map(s => {
        let parts = s.split("=")
        if (parts[0] == "include") {
            categories_to_include = []
            let cats = parts[1].split(",")
            cats.forEach(requested_cat => {
                all_categories.forEach(real_cat => {
                    if (real_cat == requested_cat) {
                        categories_to_include.push(real_cat)
                    }
                })
            })
        }
        if (parts[0] == "max") {
            max_to_find = parseInt(parts[1])
        }
    })
    return [max_to_find, categories_to_include]
}