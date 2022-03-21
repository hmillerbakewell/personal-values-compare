"use strict";
class ComparisonPoset {
    constructor(humanValues, orderings = new Map()) {
        this.humanValues = humanValues;
        this.orderings = new Map();
        this.orderings = copy_map(orderings);
        if ([...orderings.values()].length == 0) {
            this.humanValues.map(v1 => {
                this.humanValues.map(v2 => {
                    this.orderings.set(combine_values(v1, v2), Comparison.Unknown);
                });
            });
        }
    }
    comparison(v1, v2) {
        return this.orderings.get(combine_values(v1, v2));
    }
    all_above(v1) {
        return this.humanValues.filter(v2 => this.comparison(v2, v1) == Comparison.GreaterThan);
    }
    all_below(v1) {
        return this.humanValues.filter(v2 => this.comparison(v1, v2) == Comparison.GreaterThan);
    }
    add_greater_than(higher, lower) {
        let higher_and_above = [higher].concat(this.all_above(higher));
        let lower_and_below = [lower].concat(this.all_below(lower));
        let o = copy_map(this.orderings);
        higher_and_above.map(v1 => {
            lower_and_below.map(v2 => {
                o.set(combine_values(v1, v2), Comparison.GreaterThan);
                o.set(combine_values(v2, v1), Comparison.LessThanOrEqual);
            });
        });
        return new ComparisonPoset(this.humanValues, o);
    }
    supremum(value) {
        let above = this.all_above(value);
        if (above.length > 0) {
            return this.supremum(above[0]);
        }
        return value;
    }
    print_valid() {
        return print_assignation(assign_ordering(this));
    }
    num_components() {
        return this.suprema().length;
    }
    suprema() {
        return [...new Set(this.humanValues.map(v => this.supremum(v)))];
    }
    estimate_questions_remaining(determine_top_n) {
        // strategy: accurate measure for the top level
        // then a heuristic for the rest
        let completed = this.fully_determined();
        let next_level = this.maximal_top_n(completed + 1).length - completed;
        // How many questions to connect all components, then fully determine top n
        let questions_to_link_components = next_level - 1;
        // Now work out how many questions once we have linked all components
        // Most likely scenario is binary tree
        let remaining = Math.max(determine_top_n - completed, 1);
        let questions_to_fill_top_spots_typical = remaining * (remaining - 1) / 2;
        let estimate = questions_to_link_components + 1.5 * questions_to_fill_top_spots_typical;
        return Math.floor(estimate) + 3; // plus 3 to be on the safe side
    }
    is_determined(value) {
        // Fully determined values have comparisons known everywhere, except against themselves
        return this.humanValues.filter(v2 => this.comparison(value, v2) == Comparison.Unknown).length == 1;
    }
    fully_determined() {
        // Number with no unknown entries (beside themselves)
        return this.humanValues.filter(v => this.is_determined(v)).length;
    }
    maximal_top_n(n) {
        return this.humanValues.filter(v => this.all_above(v).length < n);
    }
    _max_rating(value) {
        // 0-indexed, 0 means definitely at the top
        // rating of n means there are n definitely above this
        return this.humanValues.filter(v2 => this.comparison(v2, value) == Comparison.GreaterThan).length;
    }
    ratings(max) {
        let qualifying = this.humanValues.filter(v => this._max_rating(v) < max);
        return qualifying.map(v => new RatingInformation(v, this._max_rating(v), qualifying.filter(w => this.comparison(v, w) == Comparison.Unknown && (v != w))));
    }
}
function copy_map(ordering) {
    let o = new Map();
    [...ordering.keys()].map(k => {
        o.set(k, ordering.get(k));
    });
    return o;
}
class RatingInformation {
    constructor(value, rating, unknown_comparisons) {
        this.value = value;
        this.rating = rating;
        this.unknown_comparisons = unknown_comparisons;
    }
}
function assign_ordering(poset) {
    let assignation = new Map();
    poset.humanValues.map(value => assignation.set(value, Math.random()));
    let missmatch = function () {
        // Need to check that if a > b in the poset then a > b in the assignation
        for (let value of poset.humanValues) {
            let below = poset.all_below(value);
            let biggest_below = Math.max(...below.map(v => assignation.get(v)));
            if (assignation.get(value) <= biggest_below) {
                return true;
            }
        }
        return false;
    };
    let counter = 0;
    let max = 100;
    while (missmatch() && counter < max) {
        for (let value of poset.humanValues) {
            let below = poset.all_below(value);
            let biggest_below = Math.max(...below.map(v => assignation.get(v)));
            if (assignation.get(value) <= biggest_below) {
                assignation.set(value, biggest_below + (1 - biggest_below) * Math.random());
            }
        }
        counter++;
    }
    if (counter == max) {
        throw new Error("Timeout");
    }
    return assignation;
}
function print_assignation(assignation) {
    let values = [...assignation.keys()].sort((a, b) => assignation.get(a) - assignation.get(b));
    return values;
}
function combine_values(v1, v2) {
    return v1 + "::" + v2;
}
var Comparison;
(function (Comparison) {
    Comparison[Comparison["GreaterThan"] = 1] = "GreaterThan";
    Comparison[Comparison["LessThanOrEqual"] = -1] = "LessThanOrEqual";
    Comparison[Comparison["Unknown"] = 0] = "Unknown";
})(Comparison || (Comparison = {}));
function flip_comparison(comparison) {
    switch (comparison) {
        case Comparison.GreaterThan:
            return Comparison.LessThanOrEqual;
        case Comparison.LessThanOrEqual:
            return Comparison.GreaterThan;
        case Comparison.Unknown:
            return Comparison.Unknown;
    }
}
var Categories;
(function (Categories) {
    Categories["Relationships"] = "Relationships";
    Categories["Environment"] = "Environment";
    Categories["Hobbies"] = "Hobbies";
    Categories["Career"] = "Career";
    Categories["LongTerm"] = "LongTerm";
    Categories["Health"] = "Health";
    Categories["Community"] = "Community";
})(Categories || (Categories = {}));
class PersonalValue {
    constructor(shortName, description, categories) {
        this.shortName = shortName;
        this.description = description;
        this.categories = categories;
    }
}
let AllValues = [
    new PersonalValue("Acknowledgement", "Have your opinions heard", [Categories.Health, Categories.Career]),
    new PersonalValue("Adventure", "Finding new excitements", [Categories.LongTerm]),
    new PersonalValue("Appearance", "How you look", [Categories.Health]),
    new PersonalValue("Bustle", "Always having something going on", [Categories.Environment]),
    new PersonalValue("Challenge", "Pushing yourself, regardless of the goal", [Categories.LongTerm]),
    new PersonalValue("Community", "Being part of a large group", [Categories.Community]),
    new PersonalValue("Compassion", "Recognising the needs of others", [Categories.Relationships]),
    new PersonalValue("Curiosity", "Encountering new ideas", [Categories.LongTerm]),
    new PersonalValue("Cooking", "Preparing food in your own home", [Categories.Environment]),
    new PersonalValue("Dancing", "Alone or with others", [Categories.Health, Categories.Hobbies]),
    new PersonalValue("Emotional Independence", "Your mood is not reliant on the actions of others", [Categories.Relationships, Categories.Health]),
    new PersonalValue("Exercise", "Things you do to keep fit, but not Sport", [Categories.Health]),
    new PersonalValue("Faith", "Connection to something beyond humanity", [Categories.Community]),
    new PersonalValue("Family", "Regular connection with family", [Categories.Relationships, Categories.Community]),
    new PersonalValue("Fresh Air", "Access to a clean environment", [Categories.Environment]),
    new PersonalValue("Friendship", "Deep relationships within a small group", [Categories.Relationships]),
    new PersonalValue("Games", "Boardgames, cards, computer games, etc.", [Categories.Hobbies]),
    new PersonalValue("Giving Gifts", "Finding or making gifts for others", [Categories.Hobbies, Categories.Relationships]),
    new PersonalValue("Growth", "Knowing you are changing and adapting", [Categories.LongTerm]),
    new PersonalValue("Helping Others", "Working to help those around you", [Categories.Career, Categories.Community]),
    new PersonalValue("Leadership", "People look to you for guidance", [Categories.Career]),
    new PersonalValue("Learning", "Amassing knowledge and skills", [Categories.Hobbies]),
    new PersonalValue("Love", "Finding people to share your heart with", [Categories.Relationships]),
    new PersonalValue("Pain Relief", "Pain specific to a body part", [Categories.Health]),
    new PersonalValue("Peace", "Quiet when you need it", [Categories.Environment]),
    new PersonalValue("Pets", "Having pets at home", [Categories.Environment, Categories.Relationships]),
    new PersonalValue("Performing Arts", "Music, theatre, etc.", [Categories.Hobbies]),
    new PersonalValue("Politics", "Serving the public", [Categories.Career]),
    new PersonalValue("Physical Independence", "Living without routine assistance", [Categories.Environment, Categories.Health]),
    new PersonalValue("Quality Time", "Being with friends and loved ones, no matter the activity", [Categories.Hobbies, Categories.Relationships]),
    new PersonalValue("Quiet Hobbies", "Occupied moments of calm", [Categories.Hobbies]),
    new PersonalValue("Religion", "The routine, structure, and community, as opposed to Faith", [Categories.Community]),
    new PersonalValue("Rest", "Time to quietly recover", [Categories.Health]),
    new PersonalValue("Reputation", "The things strangers might know you for", [Categories.Career, Categories.Community]),
    new PersonalValue("Responsibility", "Being trusted by others", [Categories.Career]),
    new PersonalValue("Stability", "Confidence that next week will be like this week", [Categories.LongTerm, Categories.Health, Categories.Environment]),
    new PersonalValue("Status", "The higher up the ladder the better", [Categories.Career, Categories.Community]),
    new PersonalValue("Sport", "Watching or taking part in", [Categories.Health]),
    new PersonalValue("Talking Therapy", "Regular meetings with a specialist", [Categories.Health]),
    new PersonalValue("Visual Arts and Crafts", "Creating or admiring", [Categories.Hobbies]),
    new PersonalValue("Wealth", "Beyond financial stability", [Categories.Career]),
    new PersonalValue("Working Out", "Keeping fit, but not Sport", [Categories.Hobbies]),
];
function values_by_category(categories) {
    let set_of_categories = new Set(categories);
    let should_include = (pv) => pv.categories.filter(i => set_of_categories.has(i)).length > 0;
    return AllValues.filter(should_include).map(pv => pv.shortName);
}
let Definitions = {};
AllValues.forEach(pv => { Definitions[pv.shortName] = pv.description; });
function markdown_all_values() {
    let by_category = new Map();
    AllValues.forEach(pv => {
        pv.categories.forEach(c => by_category.set(c, []));
    });
    AllValues.forEach(pv => {
        pv.categories.forEach(c => by_category.get(c).push(pv));
    });
    let s = "";
    for (let cat of [...by_category.keys()].sort()) {
        let pvs = by_category.get(cat);
        s += category_long_name(cat) + ":\n\n";
        pvs.map(pv => pv.shortName).sort().forEach(short => s += " - " + short + ": " + Definitions[short] + "\n");
        s += "\n";
    }
    return s;
}
function category_long_name(category) {
    switch (category) {
        case Categories.Career:
            return "Career";
        case Categories.Hobbies:
            return "Hobbies";
        case Categories.Environment:
            return "Home Environment";
        case Categories.LongTerm:
            return "Long Term Attitudes";
        case Categories.Relationships:
            return "Relationships and Faith";
        case Categories.Health:
            return "Health";
        case Categories.Community:
            return "Community and Faith";
    }
}
class ValuesGame {
    constructor(max_interest, categories) {
        this.max_interest = max_interest;
        this.categories = categories;
        this.poset_history = [];
        this.comparison_history = [];
        this.poset_history.push(new ComparisonPoset(values_by_category(categories)));
    }
    poset() {
        // Top one is always most recent
        return this.poset_history[0];
    }
    of_interest() {
        let poset = this.poset();
        let sorted = poset.fully_determined();
        if (sorted < this.max_interest) {
            let next_level = poset.maximal_top_n(sorted + 1).filter(v => !poset.is_determined(v));
            if (next_level.length > 1) {
                let first_choice = rFrom(next_level.map(v => [v, 1]));
                let second_choice = rFrom(next_level.filter(v => v != first_choice).map(v => [v, 1]));
                return [true, [first_choice, second_choice]];
            }
        }
        return [false, []];
    }
    choose(v1, v2) {
        this.poset_history.unshift(this.poset().add_greater_than(v1, v2));
        this.comparison_history.unshift([v1, v2]);
        this.suggest();
    }
    suggest() {
        clear_choice_div();
        let pair = this.of_interest();
        if (pair[0] != false) {
            draw_choice(pair[1][0], pair[1][1]);
            draw_estimate(this.poset().estimate_questions_remaining(this.max_interest));
        }
        else {
            draw_assignment(this.poset().print_valid().reverse().slice(0, this.max_interest));
            hide_estimate();
        }
        draw_history(this.comparison_history);
    }
    undo() {
        if (this.poset_history.length > 1) {
            this.poset_history.shift();
            this.comparison_history.shift();
            hide_assignment();
        }
        this.suggest();
    }
    remaining() {
        return this.poset().estimate_questions_remaining(this.max_interest);
    }
}
function clear_history() {
    let div = document.getElementById("history");
    div.innerHTML = "";
}
function draw_history(comparisons) {
    clear_history();
    let div = document.getElementById("history");
    if (comparisons.length > 0) {
        let label = document.createElement("div");
        let undoButton = document.createElement("button");
        undoButton.addEventListener("click", ev => {
            VG.undo();
        });
        undoButton.innerText = "Undo Last";
        label.appendChild(undoButton);
        label.classList.add("three-wide");
        div.appendChild(label);
        comparisons.forEach(c => {
            let cp1 = document.createElement("div");
            let cp2 = document.createElement("div");
            let cp3 = document.createElement("div");
            cp1.innerText = c[0];
            cp2.textContent = ">";
            cp3.innerText = c[1];
            div.appendChild(cp1);
            div.appendChild(cp2);
            div.appendChild(cp3);
        });
    }
}
function clear_choice_div() {
    let div = document.getElementById("comparisons");
    div.innerHTML = "";
}
function hide_estimate() {
    let div = document.getElementById("estimate");
    div.classList.add("invisible");
    div.innerHTML = "";
}
function draw_estimate(estimate) {
    let div = document.getElementById("estimate");
    div.classList.remove("invisible");
    let estimate_text = estimate.toString();
    if (estimate < 10) {
        estimate_text = "Under 10";
    }
    div.innerHTML = `Estimated questions remaining: ${estimate_text}`;
}
function hide_assignment() {
    let div = document.getElementById("assignment");
    div.classList.add("invisible");
    div.innerHTML = "";
}
function draw_assignment(values) {
    let div = document.getElementById("assignment");
    div.classList.remove("invisible");
    div.innerHTML = `<h1>Your top values, ranked</h1>` + values.map(v => `<div class='valueReport'><h2>${v}</h2><p>${Definitions[v]}</p></div>`).join("\n");
}
function rFrom(weighted) {
    let total = (weighted.map(v => v[1])).reduce((a, b) => a + b);
    let r = Math.random() * total;
    while (r > 0) {
        let popped = weighted.pop();
        r -= popped[1];
        if (r < 0) {
            return popped[0];
        }
    }
    // Should never reach here
    throw new Error("Weighted list was empty");
}
function draw_choice(v1, v2) {
    let div = document.getElementById("comparisons");
    function button(v, w) {
        let b = document.createElement("button");
        b.innerText = v;
        b.addEventListener("click", ev => {
            VG.choose(v, w);
        });
        return b;
    }
    function mini_label(v) {
        let d = document.createElement("div");
        d.innerText = Definitions[v];
        d.classList.add("definition");
        return d;
    }
    let label = document.createElement("h1");
    label.classList.add("header");
    label.classList.add("two-wide");
    label.innerHTML = "Which is more important?";
    clear_choice_div();
    div.appendChild(label);
    div.appendChild(button(v1, v2));
    div.appendChild(button(v2, v1));
    div.appendChild(mini_label(v1));
    div.appendChild(mini_label(v2));
}
let VG;
function start() {
    let max_and_categories = read_GET();
    let categories = max_and_categories[1];
    let max_to_determine = max_and_categories[0];
    VG = new ValuesGame(max_to_determine, categories);
    VG.suggest();
}
let read_GET = function () {
    let break_at_question_mark = window.location.toString().split(/\?/);
    let all_categories = Object.keys(Categories).filter(k => Number.isNaN(+k));
    if (break_at_question_mark.length == 1) {
        return [5, all_categories];
    }
    let instructions = break_at_question_mark[1];
    let max_to_find = 5;
    let categories_to_include = all_categories;
    instructions.split("&").map(s => {
        let parts = s.split("=");
        if (parts[0] == "include") {
            categories_to_include = [];
            let cats = parts[1].split(",");
            cats.forEach(requested_cat => {
                all_categories.forEach(real_cat => {
                    if (real_cat == requested_cat) {
                        categories_to_include.push(real_cat);
                    }
                });
            });
        }
        if (parts[0] == "max") {
            max_to_find = parseInt(parts[1]);
        }
    });
    return [max_to_find, categories_to_include];
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGFyZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb21wYXJlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxNQUFNLGVBQWU7SUFFakIsWUFBcUIsV0FBcUIsRUFBRSxZQUFxQyxJQUFJLEdBQUcsRUFBRTtRQUFyRSxnQkFBVyxHQUFYLFdBQVcsQ0FBVTtRQUQxQyxjQUFTLEdBQTRCLElBQUksR0FBRyxFQUFFLENBQUE7UUFFMUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDcEMsSUFBSSxDQUFDLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtZQUNyQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtnQkFDdEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7b0JBQ3RCLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUNsRSxDQUFDLENBQUMsQ0FBQTtZQUNOLENBQUMsQ0FBQyxDQUFBO1NBQ0w7SUFDTCxDQUFDO0lBQ0QsVUFBVSxDQUFDLEVBQVUsRUFBRSxFQUFVO1FBQzdCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBZSxDQUFBO0lBQ25FLENBQUM7SUFDRCxTQUFTLENBQUMsRUFBVTtRQUNoQixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLElBQUksVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQzNGLENBQUM7SUFDRCxT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QUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1NBQ25DO0lBQ0wsQ0FBQyxDQUFDLENBQUE7SUFDRixPQUFPLENBQUMsV0FBVyxFQUFFLHFCQUFxQixDQUFDLENBQUE7QUFDL0MsQ0FBQyxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiY2xhc3MgQ29tcGFyaXNvblBvc2V0IHtcbiAgICBvcmRlcmluZ3M6IE1hcDxzdHJpbmcsIENvbXBhcmlzb24+ID0gbmV3IE1hcCgpXG4gICAgY29uc3RydWN0b3IocmVhZG9ubHkgaHVtYW5WYWx1ZXM6IHN0cmluZ1tdLCBvcmRlcmluZ3M6IE1hcDxzdHJpbmcsIENvbXBhcmlzb24+ID0gbmV3IE1hcCgpKSB7XG4gICAgICAgIHRoaXMub3JkZXJpbmdzID0gY29weV9tYXAob3JkZXJpbmdzKVxuICAgICAgICBpZiAoWy4uLm9yZGVyaW5ncy52YWx1ZXMoKV0ubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgIHRoaXMuaHVtYW5WYWx1ZXMubWFwKHYxID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmh1bWFuVmFsdWVzLm1hcCh2MiA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub3JkZXJpbmdzLnNldChjb21iaW5lX3ZhbHVlcyh2MSwgdjIpLCBDb21wYXJpc29uLlVua25vd24pXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICB9XG4gICAgY29tcGFyaXNvbih2MTogc3RyaW5nLCB2Mjogc3RyaW5nKTogQ29tcGFyaXNvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLm9yZGVyaW5ncy5nZXQoY29tYmluZV92YWx1ZXModjEsIHYyKSkgYXMgQ29tcGFyaXNvblxuICAgIH1cbiAgICBhbGxfYWJvdmUodjE6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaHVtYW5WYWx1ZXMuZmlsdGVyKHYyID0+IHRoaXMuY29tcGFyaXNvbih2MiwgdjEpID09IENvbXBhcmlzb24uR3JlYXRlclRoYW4pXG4gICAgfVxuICAgIGFsbF9iZWxvdyh2MTogc3RyaW5nKTogc3RyaW5nW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5odW1hblZhbHVlcy5maWx0ZXIodjIgPT4gdGhpcy5jb21wYXJpc29uKHYxLCB2MikgPT0gQ29tcGFyaXNvbi5HcmVhdGVyVGhhbilcbiAgICB9XG4gICAgYWRkX2dyZWF0ZXJfdGhhbihoaWdoZXI6IHN0cmluZywgbG93ZXI6IHN0cmluZyk6IENvbXBhcmlzb25Qb3NldCB7XG4gICAgICAgIGxldCBoaWdoZXJfYW5kX2Fib3ZlID0gW2hpZ2hlcl0uY29uY2F0KHRoaXMuYWxsX2Fib3ZlKGhpZ2hlcikpXG4gICAgICAgIGxldCBsb3dlcl9hbmRfYmVsb3cgPSBbbG93ZXJdLmNvbmNhdCh0aGlzLmFsbF9iZWxvdyhsb3dlcikpXG4gICAgICAgIGxldCBvID0gY29weV9tYXAodGhpcy5vcmRlcmluZ3MpXG4gICAgICAgIGhpZ2hlcl9hbmRfYWJvdmUubWFwKHYxID0+IHtcbiAgICAgICAgICAgIGxvd2VyX2FuZF9iZWxvdy5tYXAodjIgPT4ge1xuICAgICAgICAgICAgICAgIG8uc2V0KGNvbWJpbmVfdmFsdWVzKHYxLCB2MiksIENvbXBhcmlzb24uR3JlYXRlclRoYW4pXG4gICAgICAgICAgICAgICAgby5zZXQoY29tYmluZV92YWx1ZXModjIsIHYxKSwgQ29tcGFyaXNvbi5MZXNzVGhhbk9yRXF1YWwpXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuXG4gICAgICAgIHJldHVybiBuZXcgQ29tcGFyaXNvblBvc2V0KHRoaXMuaHVtYW5WYWx1ZXMsIG8pXG4gICAgfVxuXG4gICAgc3VwcmVtdW0odmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIGxldCBhYm92ZSA9IHRoaXMuYWxsX2Fib3ZlKHZhbHVlKVxuICAgICAgICBpZiAoYWJvdmUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3VwcmVtdW0oYWJvdmVbMF0pXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHZhbHVlXG4gICAgfVxuXG4gICAgcHJpbnRfdmFsaWQoKTogc3RyaW5nW10ge1xuICAgICAgICByZXR1cm4gcHJpbnRfYXNzaWduYXRpb24oYXNzaWduX29yZGVyaW5nKHRoaXMpKVxuICAgIH1cblxuICAgIG51bV9jb21wb25lbnRzKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLnN1cHJlbWEoKS5sZW5ndGhcbiAgICB9XG5cbiAgICBzdXByZW1hKCk6IHN0cmluZ1tdIHtcbiAgICAgICAgcmV0dXJuIFsuLi4gbmV3IFNldCh0aGlzLmh1bWFuVmFsdWVzLm1hcCh2ID0+IHRoaXMuc3VwcmVtdW0odikpKV1cbiAgICB9XG5cbiAgICBlc3RpbWF0ZV9xdWVzdGlvbnNfcmVtYWluaW5nKGRldGVybWluZV90b3BfbjogbnVtYmVyKTogbnVtYmVyIHtcbiAgICAgICAgLy8gc3RyYXRlZ3k6IGFjY3VyYXRlIG1lYXN1cmUgZm9yIHRoZSB0b3AgbGV2ZWxcbiAgICAgICAgLy8gdGhlbiBhIGhldXJpc3RpYyBmb3IgdGhlIHJlc3RcblxuICAgICAgICBsZXQgY29tcGxldGVkID0gdGhpcy5mdWxseV9kZXRlcm1pbmVkKClcblxuICAgICAgICBsZXQgbmV4dF9sZXZlbCA9IHRoaXMubWF4aW1hbF90b3Bfbihjb21wbGV0ZWQgKyAxKS5sZW5ndGggLSBjb21wbGV0ZWRcblxuICAgICAgICAvLyBIb3cgbWFueSBxdWVzdGlvbnMgdG8gY29ubmVjdCBhbGwgY29tcG9uZW50cywgdGhlbiBmdWxseSBkZXRlcm1pbmUgdG9wIG5cbiAgICAgICAgbGV0IHF1ZXN0aW9uc190b19saW5rX2NvbXBvbmVudHMgPSBuZXh0X2xldmVsIC0gMVxuXG4gICAgICAgIC8vIE5vdyB3b3JrIG91dCBob3cgbWFueSBxdWVzdGlvbnMgb25jZSB3ZSBoYXZlIGxpbmtlZCBhbGwgY29tcG9uZW50c1xuXG4gICAgICAgIC8vIE1vc3QgbGlrZWx5IHNjZW5hcmlvIGlzIGJpbmFyeSB0cmVlXG4gICAgICAgIGxldCByZW1haW5pbmcgPSBNYXRoLm1heChkZXRlcm1pbmVfdG9wX24gLSBjb21wbGV0ZWQsIDEpXG4gICAgICAgIGxldCBxdWVzdGlvbnNfdG9fZmlsbF90b3Bfc3BvdHNfdHlwaWNhbCA9IHJlbWFpbmluZyAqIChyZW1haW5pbmcgLSAxKSAvIDJcblxuICAgICAgICBsZXQgZXN0aW1hdGUgPSBxdWVzdGlvbnNfdG9fbGlua19jb21wb25lbnRzICsgMS41ICogcXVlc3Rpb25zX3RvX2ZpbGxfdG9wX3Nwb3RzX3R5cGljYWxcbiAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoZXN0aW1hdGUpICsgMyAvLyBwbHVzIDMgdG8gYmUgb24gdGhlIHNhZmUgc2lkZVxuICAgIH1cblxuICAgIGlzX2RldGVybWluZWQodmFsdWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICAvLyBGdWxseSBkZXRlcm1pbmVkIHZhbHVlcyBoYXZlIGNvbXBhcmlzb25zIGtub3duIGV2ZXJ5d2hlcmUsIGV4Y2VwdCBhZ2FpbnN0IHRoZW1zZWx2ZXNcbiAgICAgICAgcmV0dXJuIHRoaXMuaHVtYW5WYWx1ZXMuZmlsdGVyKHYyID0+IHRoaXMuY29tcGFyaXNvbih2YWx1ZSwgdjIpID09IENvbXBhcmlzb24uVW5rbm93bikubGVuZ3RoID09IDFcbiAgICB9XG5cbiAgICBmdWxseV9kZXRlcm1pbmVkKCk6IG51bWJlciB7XG4gICAgICAgIC8vIE51bWJlciB3aXRoIG5vIHVua25vd24gZW50cmllcyAoYmVzaWRlIHRoZW1zZWx2ZXMpXG4gICAgICAgIHJldHVybiB0aGlzLmh1bWFuVmFsdWVzLmZpbHRlcih2ID0+IHRoaXMuaXNfZGV0ZXJtaW5lZCh2KSkubGVuZ3RoXG4gICAgfVxuXG4gICAgbWF4aW1hbF90b3BfbihuOiBudW1iZXIpOiBzdHJpbmdbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLmh1bWFuVmFsdWVzLmZpbHRlcih2ID0+IHRoaXMuYWxsX2Fib3ZlKHYpLmxlbmd0aCA8IG4pXG4gICAgfVxuXG4gICAgX21heF9yYXRpbmcodmFsdWU6IHN0cmluZyk6IG51bWJlciB7XG4gICAgICAgIC8vIDAtaW5kZXhlZCwgMCBtZWFucyBkZWZpbml0ZWx5IGF0IHRoZSB0b3BcbiAgICAgICAgLy8gcmF0aW5nIG9mIG4gbWVhbnMgdGhlcmUgYXJlIG4gZGVmaW5pdGVseSBhYm92ZSB0aGlzXG4gICAgICAgIHJldHVybiB0aGlzLmh1bWFuVmFsdWVzLmZpbHRlcih2MiA9PiB0aGlzLmNvbXBhcmlzb24odjIsIHZhbHVlKSA9PSBDb21wYXJpc29uLkdyZWF0ZXJUaGFuKS5sZW5ndGhcbiAgICB9XG5cbiAgICByYXRpbmdzKG1heDogbnVtYmVyKTogUmF0aW5nSW5mb3JtYXRpb25bXSB7XG5cbiAgICAgICAgbGV0IHF1YWxpZnlpbmcgPSB0aGlzLmh1bWFuVmFsdWVzLmZpbHRlcih2ID0+IHRoaXMuX21heF9yYXRpbmcodikgPCBtYXgpXG5cbiAgICAgICAgcmV0dXJuIHF1YWxpZnlpbmcubWFwKHYgPT4gbmV3IFJhdGluZ0luZm9ybWF0aW9uKFxuICAgICAgICAgICAgdixcbiAgICAgICAgICAgIHRoaXMuX21heF9yYXRpbmcodiksXG4gICAgICAgICAgICBxdWFsaWZ5aW5nLmZpbHRlcih3ID0+IHRoaXMuY29tcGFyaXNvbih2LCB3KSA9PSBDb21wYXJpc29uLlVua25vd24gJiYgKHYgIT0gdykpXG4gICAgICAgICkpXG4gICAgfVxufVxuXG5mdW5jdGlvbiBjb3B5X21hcDxLLCBWPihvcmRlcmluZzogTWFwPEssIFY+KTogTWFwPEssIFY+IHtcbiAgICBsZXQgbzogTWFwPEssIFY+ID0gbmV3IE1hcCgpO1xuICAgIFsuLi5vcmRlcmluZy5rZXlzKCldLm1hcChrID0+IHtcbiAgICAgICAgby5zZXQoaywgb3JkZXJpbmcuZ2V0KGspIGFzIFYpXG4gICAgfSlcbiAgICByZXR1cm4gb1xufVxuXG5jbGFzcyBSYXRpbmdJbmZvcm1hdGlvbiB7XG4gICAgY29uc3RydWN0b3IocmVhZG9ubHkgdmFsdWU6IHN0cmluZywgcmVhZG9ubHkgcmF0aW5nOiBudW1iZXIsIHJlYWRvbmx5IHVua25vd25fY29tcGFyaXNvbnM6IHN0cmluZ1tdKSB7IH1cbn1cblxuZnVuY3Rpb24gYXNzaWduX29yZGVyaW5nKHBvc2V0OiBDb21wYXJpc29uUG9zZXQpOiBNYXA8c3RyaW5nLCBudW1iZXI+IHtcbiAgICBsZXQgYXNzaWduYXRpb24gPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpXG4gICAgcG9zZXQuaHVtYW5WYWx1ZXMubWFwKHZhbHVlID0+IGFzc2lnbmF0aW9uLnNldCh2YWx1ZSwgTWF0aC5yYW5kb20oKSkpXG4gICAgbGV0IG1pc3NtYXRjaCA9IGZ1bmN0aW9uICgpOiBCb29sZWFuIHtcbiAgICAgICAgLy8gTmVlZCB0byBjaGVjayB0aGF0IGlmIGEgPiBiIGluIHRoZSBwb3NldCB0aGVuIGEgPiBiIGluIHRoZSBhc3NpZ25hdGlvblxuICAgICAgICBmb3IgKGxldCB2YWx1ZSBvZiBwb3NldC5odW1hblZhbHVlcykge1xuICAgICAgICAgICAgbGV0IGJlbG93ID0gcG9zZXQuYWxsX2JlbG93KHZhbHVlKVxuICAgICAgICAgICAgbGV0IGJpZ2dlc3RfYmVsb3cgPSBNYXRoLm1heCguLi5iZWxvdy5tYXAodiA9PiBhc3NpZ25hdGlvbi5nZXQodikgYXMgQ29tcGFyaXNvbikpXG4gICAgICAgICAgICBpZiAoYXNzaWduYXRpb24uZ2V0KHZhbHVlKSBhcyBDb21wYXJpc29uIDw9IGJpZ2dlc3RfYmVsb3cpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgICBsZXQgY291bnRlciA9IDBcbiAgICBsZXQgbWF4ID0gMTAwXG4gICAgd2hpbGUgKG1pc3NtYXRjaCgpICYmIGNvdW50ZXIgPCBtYXgpIHtcbiAgICAgICAgZm9yIChsZXQgdmFsdWUgb2YgcG9zZXQuaHVtYW5WYWx1ZXMpIHtcbiAgICAgICAgICAgIGxldCBiZWxvdyA9IHBvc2V0LmFsbF9iZWxvdyh2YWx1ZSlcbiAgICAgICAgICAgIGxldCBiaWdnZXN0X2JlbG93ID0gTWF0aC5tYXgoLi4uYmVsb3cubWFwKHYgPT4gYXNzaWduYXRpb24uZ2V0KHYpIGFzIG51bWJlcikpXG4gICAgICAgICAgICBpZiAoYXNzaWduYXRpb24uZ2V0KHZhbHVlKSBhcyBudW1iZXIgPD0gYmlnZ2VzdF9iZWxvdykge1xuICAgICAgICAgICAgICAgIGFzc2lnbmF0aW9uLnNldCh2YWx1ZSwgYmlnZ2VzdF9iZWxvdyArICgxIC0gYmlnZ2VzdF9iZWxvdykgKiBNYXRoLnJhbmRvbSgpKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvdW50ZXIrK1xuICAgIH1cbiAgICBpZiAoY291bnRlciA9PSBtYXgpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGltZW91dFwiKVxuICAgIH1cbiAgICByZXR1cm4gYXNzaWduYXRpb25cbn1cblxuZnVuY3Rpb24gcHJpbnRfYXNzaWduYXRpb24oYXNzaWduYXRpb246IE1hcDxzdHJpbmcsIG51bWJlcj4pOiBzdHJpbmdbXSB7XG4gICAgbGV0IHZhbHVlcyA9IFsuLi5hc3NpZ25hdGlvbi5rZXlzKCldLnNvcnQoKGEsIGIpID0+IChhc3NpZ25hdGlvbi5nZXQoYSkgYXMgbnVtYmVyKSAtIChhc3NpZ25hdGlvbi5nZXQoYikgYXMgbnVtYmVyKSlcbiAgICByZXR1cm4gdmFsdWVzXG59XG5cbmZ1bmN0aW9uIGNvbWJpbmVfdmFsdWVzKHYxOiBzdHJpbmcsIHYyOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiB2MSArIFwiOjpcIiArIHYyXG59XG5cbmVudW0gQ29tcGFyaXNvbiB7XG4gICAgR3JlYXRlclRoYW4gPSAxLCBMZXNzVGhhbk9yRXF1YWwgPSAtMSwgVW5rbm93biA9IDBcbn1cblxuZnVuY3Rpb24gZmxpcF9jb21wYXJpc29uKGNvbXBhcmlzb246IENvbXBhcmlzb24pOiBDb21wYXJpc29uIHtcbiAgICBzd2l0Y2ggKGNvbXBhcmlzb24pIHtcbiAgICAgICAgY2FzZSBDb21wYXJpc29uLkdyZWF0ZXJUaGFuOlxuICAgICAgICAgICAgcmV0dXJuIENvbXBhcmlzb24uTGVzc1RoYW5PckVxdWFsXG4gICAgICAgIGNhc2UgQ29tcGFyaXNvbi5MZXNzVGhhbk9yRXF1YWw6XG4gICAgICAgICAgICByZXR1cm4gQ29tcGFyaXNvbi5HcmVhdGVyVGhhblxuICAgICAgICBjYXNlIENvbXBhcmlzb24uVW5rbm93bjpcbiAgICAgICAgICAgIHJldHVybiBDb21wYXJpc29uLlVua25vd25cbiAgICB9XG59XG5cblxuXG5lbnVtIENhdGVnb3JpZXMge1xuICAgIFJlbGF0aW9uc2hpcHMgPSBcIlJlbGF0aW9uc2hpcHNcIixcbiAgICBFbnZpcm9ubWVudCA9IFwiRW52aXJvbm1lbnRcIixcbiAgICBIb2JiaWVzID0gXCJIb2JiaWVzXCIsXG4gICAgQ2FyZWVyID0gXCJDYXJlZXJcIixcbiAgICBMb25nVGVybSA9IFwiTG9uZ1Rlcm1cIixcbiAgICBIZWFsdGggPSBcIkhlYWx0aFwiLFxuICAgIENvbW11bml0eSA9IFwiQ29tbXVuaXR5XCJcbn1cblxuXG5jbGFzcyBQZXJzb25hbFZhbHVlIHtcbiAgICBjb25zdHJ1Y3RvcihyZWFkb25seSBzaG9ydE5hbWU6IHN0cmluZywgcmVhZG9ubHkgZGVzY3JpcHRpb246IHN0cmluZywgcmVhZG9ubHkgY2F0ZWdvcmllczogQ2F0ZWdvcmllc1tdKSB7IH1cbn1cblxuXG5sZXQgQWxsVmFsdWVzOiBQZXJzb25hbFZhbHVlW10gPSBbXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJBY2tub3dsZWRnZW1lbnRcIiwgXCJIYXZlIHlvdXIgb3BpbmlvbnMgaGVhcmRcIiwgW0NhdGVnb3JpZXMuSGVhbHRoLCBDYXRlZ29yaWVzLkNhcmVlcl0pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiQWR2ZW50dXJlXCIsIFwiRmluZGluZyBuZXcgZXhjaXRlbWVudHNcIiwgW0NhdGVnb3JpZXMuTG9uZ1Rlcm1dKSxcbiAgICBuZXcgUGVyc29uYWxWYWx1ZShcIkFwcGVhcmFuY2VcIiwgXCJIb3cgeW91IGxvb2tcIiwgW0NhdGVnb3JpZXMuSGVhbHRoXSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJCdXN0bGVcIiwgXCJBbHdheXMgaGF2aW5nIHNvbWV0aGluZyBnb2luZyBvblwiLCBbQ2F0ZWdvcmllcy5FbnZpcm9ubWVudF0pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiQ2hhbGxlbmdlXCIsIFwiUHVzaGluZyB5b3Vyc2VsZiwgcmVnYXJkbGVzcyBvZiB0aGUgZ29hbFwiLCBbQ2F0ZWdvcmllcy5Mb25nVGVybV0pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiQ29tbXVuaXR5XCIsIFwiQmVpbmcgcGFydCBvZiBhIGxhcmdlIGdyb3VwXCIsIFtDYXRlZ29yaWVzLkNvbW11bml0eV0pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiQ29tcGFzc2lvblwiLCBcIlJlY29nbmlzaW5nIHRoZSBuZWVkcyBvZiBvdGhlcnNcIiwgW0NhdGVnb3JpZXMuUmVsYXRpb25zaGlwc10pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiQ3VyaW9zaXR5XCIsIFwiRW5jb3VudGVyaW5nIG5ldyBpZGVhc1wiLCBbQ2F0ZWdvcmllcy5Mb25nVGVybV0pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiQ29va2luZ1wiLCBcIlByZXBhcmluZyBmb29kIGluIHlvdXIgb3duIGhvbWVcIiwgW0NhdGVnb3JpZXMuRW52aXJvbm1lbnRdKSxcbiAgICBuZXcgUGVyc29uYWxWYWx1ZShcIkRhbmNpbmdcIiwgXCJBbG9uZSBvciB3aXRoIG90aGVyc1wiLCBbQ2F0ZWdvcmllcy5IZWFsdGgsIENhdGVnb3JpZXMuSG9iYmllc10pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiRW1vdGlvbmFsIEluZGVwZW5kZW5jZVwiLCBcIllvdXIgbW9vZCBpcyBub3QgcmVsaWFudCBvbiB0aGUgYWN0aW9ucyBvZiBvdGhlcnNcIiwgW0NhdGVnb3JpZXMuUmVsYXRpb25zaGlwcywgQ2F0ZWdvcmllcy5IZWFsdGhdKSxcbiAgICBuZXcgUGVyc29uYWxWYWx1ZShcIkV4ZXJjaXNlXCIsIFwiVGhpbmdzIHlvdSBkbyB0byBrZWVwIGZpdCwgYnV0IG5vdCBTcG9ydFwiLCBbQ2F0ZWdvcmllcy5IZWFsdGhdKSxcbiAgICBuZXcgUGVyc29uYWxWYWx1ZShcIkZhaXRoXCIsIFwiQ29ubmVjdGlvbiB0byBzb21ldGhpbmcgYmV5b25kIGh1bWFuaXR5XCIsIFtDYXRlZ29yaWVzLkNvbW11bml0eV0pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiRmFtaWx5XCIsIFwiUmVndWxhciBjb25uZWN0aW9uIHdpdGggZmFtaWx5XCIsIFtDYXRlZ29yaWVzLlJlbGF0aW9uc2hpcHMsIENhdGVnb3JpZXMuQ29tbXVuaXR5XSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJGcmVzaCBBaXJcIiwgXCJBY2Nlc3MgdG8gYSBjbGVhbiBlbnZpcm9ubWVudFwiLCBbQ2F0ZWdvcmllcy5FbnZpcm9ubWVudF0pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiRnJpZW5kc2hpcFwiLCBcIkRlZXAgcmVsYXRpb25zaGlwcyB3aXRoaW4gYSBzbWFsbCBncm91cFwiLCBbQ2F0ZWdvcmllcy5SZWxhdGlvbnNoaXBzXSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJHYW1lc1wiLCBcIkJvYXJkZ2FtZXMsIGNhcmRzLCBjb21wdXRlciBnYW1lcywgZXRjLlwiLCBbQ2F0ZWdvcmllcy5Ib2JiaWVzXSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJHaXZpbmcgR2lmdHNcIiwgXCJGaW5kaW5nIG9yIG1ha2luZyBnaWZ0cyBmb3Igb3RoZXJzXCIsIFtDYXRlZ29yaWVzLkhvYmJpZXMsIENhdGVnb3JpZXMuUmVsYXRpb25zaGlwc10pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiR3Jvd3RoXCIsIFwiS25vd2luZyB5b3UgYXJlIGNoYW5naW5nIGFuZCBhZGFwdGluZ1wiLCBbQ2F0ZWdvcmllcy5Mb25nVGVybV0pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiSGVscGluZyBPdGhlcnNcIiwgXCJXb3JraW5nIHRvIGhlbHAgdGhvc2UgYXJvdW5kIHlvdVwiLCBbQ2F0ZWdvcmllcy5DYXJlZXIsIENhdGVnb3JpZXMuQ29tbXVuaXR5XSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJMZWFkZXJzaGlwXCIsIFwiUGVvcGxlIGxvb2sgdG8geW91IGZvciBndWlkYW5jZVwiLCBbQ2F0ZWdvcmllcy5DYXJlZXJdKSxcbiAgICBuZXcgUGVyc29uYWxWYWx1ZShcIkxlYXJuaW5nXCIsIFwiQW1hc3Npbmcga25vd2xlZGdlIGFuZCBza2lsbHNcIiwgW0NhdGVnb3JpZXMuSG9iYmllc10pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiTG92ZVwiLCBcIkZpbmRpbmcgcGVvcGxlIHRvIHNoYXJlIHlvdXIgaGVhcnQgd2l0aFwiLCBbQ2F0ZWdvcmllcy5SZWxhdGlvbnNoaXBzXSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJQYWluIFJlbGllZlwiLCBcIlBhaW4gc3BlY2lmaWMgdG8gYSBib2R5IHBhcnRcIiwgW0NhdGVnb3JpZXMuSGVhbHRoXSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJQZWFjZVwiLCBcIlF1aWV0IHdoZW4geW91IG5lZWQgaXRcIiwgW0NhdGVnb3JpZXMuRW52aXJvbm1lbnRdKSxcbiAgICBuZXcgUGVyc29uYWxWYWx1ZShcIlBldHNcIiwgXCJIYXZpbmcgcGV0cyBhdCBob21lXCIsIFtDYXRlZ29yaWVzLkVudmlyb25tZW50LCBDYXRlZ29yaWVzLlJlbGF0aW9uc2hpcHNdKSxcbiAgICBuZXcgUGVyc29uYWxWYWx1ZShcIlBlcmZvcm1pbmcgQXJ0c1wiLCBcIk11c2ljLCB0aGVhdHJlLCBldGMuXCIsIFtDYXRlZ29yaWVzLkhvYmJpZXNdKSxcbiAgICBuZXcgUGVyc29uYWxWYWx1ZShcIlBvbGl0aWNzXCIsIFwiU2VydmluZyB0aGUgcHVibGljXCIsIFtDYXRlZ29yaWVzLkNhcmVlcl0pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiUGh5c2ljYWwgSW5kZXBlbmRlbmNlXCIsIFwiTGl2aW5nIHdpdGhvdXQgcm91dGluZSBhc3Npc3RhbmNlXCIsIFtDYXRlZ29yaWVzLkVudmlyb25tZW50LCBDYXRlZ29yaWVzLkhlYWx0aF0pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiUXVhbGl0eSBUaW1lXCIsIFwiQmVpbmcgd2l0aCBmcmllbmRzIGFuZCBsb3ZlZCBvbmVzLCBubyBtYXR0ZXIgdGhlIGFjdGl2aXR5XCIsIFtDYXRlZ29yaWVzLkhvYmJpZXMsIENhdGVnb3JpZXMuUmVsYXRpb25zaGlwc10pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiUXVpZXQgSG9iYmllc1wiLCBcIk9jY3VwaWVkIG1vbWVudHMgb2YgY2FsbVwiLCBbQ2F0ZWdvcmllcy5Ib2JiaWVzXSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJSZWxpZ2lvblwiLCBcIlRoZSByb3V0aW5lLCBzdHJ1Y3R1cmUsIGFuZCBjb21tdW5pdHksIGFzIG9wcG9zZWQgdG8gRmFpdGhcIiwgW0NhdGVnb3JpZXMuQ29tbXVuaXR5XSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJSZXN0XCIsIFwiVGltZSB0byBxdWlldGx5IHJlY292ZXJcIiwgW0NhdGVnb3JpZXMuSGVhbHRoXSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJSZXB1dGF0aW9uXCIsIFwiVGhlIHRoaW5ncyBzdHJhbmdlcnMgbWlnaHQga25vdyB5b3UgZm9yXCIsIFtDYXRlZ29yaWVzLkNhcmVlciwgQ2F0ZWdvcmllcy5Db21tdW5pdHldKSxcbiAgICBuZXcgUGVyc29uYWxWYWx1ZShcIlJlc3BvbnNpYmlsaXR5XCIsIFwiQmVpbmcgdHJ1c3RlZCBieSBvdGhlcnNcIiwgW0NhdGVnb3JpZXMuQ2FyZWVyXSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJTdGFiaWxpdHlcIiwgXCJDb25maWRlbmNlIHRoYXQgbmV4dCB3ZWVrIHdpbGwgYmUgbGlrZSB0aGlzIHdlZWtcIiwgW0NhdGVnb3JpZXMuTG9uZ1Rlcm0sIENhdGVnb3JpZXMuSGVhbHRoLCBDYXRlZ29yaWVzLkVudmlyb25tZW50XSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJTdGF0dXNcIiwgXCJUaGUgaGlnaGVyIHVwIHRoZSBsYWRkZXIgdGhlIGJldHRlclwiLCBbQ2F0ZWdvcmllcy5DYXJlZXIsIENhdGVnb3JpZXMuQ29tbXVuaXR5XSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJTcG9ydFwiLCBcIldhdGNoaW5nIG9yIHRha2luZyBwYXJ0IGluXCIsIFtDYXRlZ29yaWVzLkhlYWx0aF0pLFxuICAgIG5ldyBQZXJzb25hbFZhbHVlKFwiVGFsa2luZyBUaGVyYXB5XCIsIFwiUmVndWxhciBtZWV0aW5ncyB3aXRoIGEgc3BlY2lhbGlzdFwiLCBbQ2F0ZWdvcmllcy5IZWFsdGhdKSxcbiAgICBuZXcgUGVyc29uYWxWYWx1ZShcIlZpc3VhbCBBcnRzIGFuZCBDcmFmdHNcIiwgXCJDcmVhdGluZyBvciBhZG1pcmluZ1wiLCBbQ2F0ZWdvcmllcy5Ib2JiaWVzXSksXG4gICAgbmV3IFBlcnNvbmFsVmFsdWUoXCJXZWFsdGhcIiwgXCJCZXlvbmQgZmluYW5jaWFsIHN0YWJpbGl0eVwiLCBbQ2F0ZWdvcmllcy5DYXJlZXJdKSxcbiAgICBuZXcgUGVyc29uYWxWYWx1ZShcIldvcmtpbmcgT3V0XCIsIFwiS2VlcGluZyBmaXQsIGJ1dCBub3QgU3BvcnRcIiwgW0NhdGVnb3JpZXMuSG9iYmllc10pLFxuXVxuXG5mdW5jdGlvbiB2YWx1ZXNfYnlfY2F0ZWdvcnkoY2F0ZWdvcmllczogQ2F0ZWdvcmllc1tdKTogc3RyaW5nW10ge1xuICAgIGxldCBzZXRfb2ZfY2F0ZWdvcmllcyA9IG5ldyBTZXQoY2F0ZWdvcmllcylcbiAgICBsZXQgc2hvdWxkX2luY2x1ZGUgPSAocHY6IFBlcnNvbmFsVmFsdWUpID0+IHB2LmNhdGVnb3JpZXMuZmlsdGVyKGkgPT4gc2V0X29mX2NhdGVnb3JpZXMuaGFzKGkpKS5sZW5ndGggPiAwXG5cbiAgICByZXR1cm4gQWxsVmFsdWVzLmZpbHRlcihzaG91bGRfaW5jbHVkZSkubWFwKHB2ID0+IHB2LnNob3J0TmFtZSlcbn1cblxubGV0IERlZmluaXRpb25zOiBhbnkgPSB7fVxuQWxsVmFsdWVzLmZvckVhY2gocHYgPT4geyBEZWZpbml0aW9uc1twdi5zaG9ydE5hbWVdID0gcHYuZGVzY3JpcHRpb24gfSlcblxuZnVuY3Rpb24gbWFya2Rvd25fYWxsX3ZhbHVlcygpOiBzdHJpbmcge1xuICAgIGxldCBieV9jYXRlZ29yeSA9IG5ldyBNYXA8Q2F0ZWdvcmllcywgUGVyc29uYWxWYWx1ZVtdPigpXG4gICAgQWxsVmFsdWVzLmZvckVhY2gocHYgPT4ge1xuICAgICAgICBwdi5jYXRlZ29yaWVzLmZvckVhY2goYyA9PiBieV9jYXRlZ29yeS5zZXQoYywgW10pKVxuICAgIH0pXG4gICAgQWxsVmFsdWVzLmZvckVhY2gocHYgPT4ge1xuICAgICAgICBwdi5jYXRlZ29yaWVzLmZvckVhY2goYyA9PiAoYnlfY2F0ZWdvcnkuZ2V0KGMpIGFzIFBlcnNvbmFsVmFsdWVbXSkucHVzaChwdikpXG4gICAgfSlcbiAgICBsZXQgcyA9IFwiXCJcbiAgICBmb3IgKGxldCBjYXQgb2YgWy4uLmJ5X2NhdGVnb3J5LmtleXMoKV0uc29ydCgpKSB7XG4gICAgICAgIGxldCBwdnMgPSBieV9jYXRlZ29yeS5nZXQoY2F0KSBhcyBQZXJzb25hbFZhbHVlW11cbiAgICAgICAgcyArPSBjYXRlZ29yeV9sb25nX25hbWUoY2F0KSArIFwiOlxcblxcblwiXG4gICAgICAgIHB2cy5tYXAocHYgPT4gcHYuc2hvcnROYW1lKS5zb3J0KCkuZm9yRWFjaChzaG9ydCA9PiBzICs9IFwiIC0gXCIgKyBzaG9ydCArIFwiOiBcIiArIERlZmluaXRpb25zW3Nob3J0XSArIFwiXFxuXCIpXG4gICAgICAgIHMgKz0gXCJcXG5cIlxuICAgIH1cbiAgICByZXR1cm4gc1xufVxuXG5mdW5jdGlvbiBjYXRlZ29yeV9sb25nX25hbWUoY2F0ZWdvcnk6IENhdGVnb3JpZXMpOiBzdHJpbmcge1xuICAgIHN3aXRjaCAoY2F0ZWdvcnkpIHtcbiAgICAgICAgY2FzZSBDYXRlZ29yaWVzLkNhcmVlcjpcbiAgICAgICAgICAgIHJldHVybiBcIkNhcmVlclwiXG4gICAgICAgIGNhc2UgQ2F0ZWdvcmllcy5Ib2JiaWVzOlxuICAgICAgICAgICAgcmV0dXJuIFwiSG9iYmllc1wiXG4gICAgICAgIGNhc2UgQ2F0ZWdvcmllcy5FbnZpcm9ubWVudDpcbiAgICAgICAgICAgIHJldHVybiBcIkhvbWUgRW52aXJvbm1lbnRcIlxuICAgICAgICBjYXNlIENhdGVnb3JpZXMuTG9uZ1Rlcm06XG4gICAgICAgICAgICByZXR1cm4gXCJMb25nIFRlcm0gQXR0aXR1ZGVzXCJcbiAgICAgICAgY2FzZSBDYXRlZ29yaWVzLlJlbGF0aW9uc2hpcHM6XG4gICAgICAgICAgICByZXR1cm4gXCJSZWxhdGlvbnNoaXBzIGFuZCBGYWl0aFwiXG4gICAgICAgIGNhc2UgQ2F0ZWdvcmllcy5IZWFsdGg6XG4gICAgICAgICAgICByZXR1cm4gXCJIZWFsdGhcIlxuICAgICAgICBjYXNlIENhdGVnb3JpZXMuQ29tbXVuaXR5OlxuICAgICAgICAgICAgcmV0dXJuIFwiQ29tbXVuaXR5IGFuZCBGYWl0aFwiXG4gICAgfVxufVxuXG5jbGFzcyBWYWx1ZXNHYW1lIHtcbiAgICBwb3NldF9oaXN0b3J5OiBDb21wYXJpc29uUG9zZXRbXSA9IFtdXG4gICAgY29tcGFyaXNvbl9oaXN0b3J5OiBbc3RyaW5nLCBzdHJpbmddW10gPSBbXVxuICAgIHBvc2V0KCkge1xuICAgICAgICAvLyBUb3Agb25lIGlzIGFsd2F5cyBtb3N0IHJlY2VudFxuICAgICAgICByZXR1cm4gdGhpcy5wb3NldF9oaXN0b3J5WzBdXG4gICAgfVxuICAgIGNvbnN0cnVjdG9yKHJlYWRvbmx5IG1heF9pbnRlcmVzdDogbnVtYmVyLCByZWFkb25seSBjYXRlZ29yaWVzOiBDYXRlZ29yaWVzW10pIHtcbiAgICAgICAgdGhpcy5wb3NldF9oaXN0b3J5LnB1c2gobmV3IENvbXBhcmlzb25Qb3NldCh2YWx1ZXNfYnlfY2F0ZWdvcnkoY2F0ZWdvcmllcykpKVxuICAgIH1cbiAgICBvZl9pbnRlcmVzdCgpOiBbYm9vbGVhbiwgc3RyaW5nW11dIHtcbiAgICAgICAgbGV0IHBvc2V0ID0gdGhpcy5wb3NldCgpXG4gICAgICAgIGxldCBzb3J0ZWQgPSBwb3NldC5mdWxseV9kZXRlcm1pbmVkKClcblxuICAgICAgICBpZiAoc29ydGVkIDwgdGhpcy5tYXhfaW50ZXJlc3QpIHtcbiAgICAgICAgICAgIGxldCBuZXh0X2xldmVsID0gcG9zZXQubWF4aW1hbF90b3Bfbihzb3J0ZWQgKyAxKS5maWx0ZXIodiA9PiAhcG9zZXQuaXNfZGV0ZXJtaW5lZCh2KSlcblxuXG5cbiAgICAgICAgICAgIGlmIChuZXh0X2xldmVsLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICBsZXQgZmlyc3RfY2hvaWNlID0gckZyb20obmV4dF9sZXZlbC5tYXAodiA9PiBbdiwgMV0pKVxuICAgICAgICAgICAgICAgIGxldCBzZWNvbmRfY2hvaWNlID0gckZyb20obmV4dF9sZXZlbC5maWx0ZXIodiA9PiB2ICE9IGZpcnN0X2Nob2ljZSkubWFwKHYgPT4gW3YsIDFdKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gW3RydWUsIFtmaXJzdF9jaG9pY2UsIHNlY29uZF9jaG9pY2VdXVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBbZmFsc2UsIFtdXVxuICAgIH1cbiAgICBjaG9vc2UodjE6IHN0cmluZywgdjI6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICB0aGlzLnBvc2V0X2hpc3RvcnkudW5zaGlmdCh0aGlzLnBvc2V0KCkuYWRkX2dyZWF0ZXJfdGhhbih2MSwgdjIpKVxuICAgICAgICB0aGlzLmNvbXBhcmlzb25faGlzdG9yeS51bnNoaWZ0KFt2MSwgdjJdKVxuICAgICAgICB0aGlzLnN1Z2dlc3QoKVxuICAgIH1cbiAgICBzdWdnZXN0KCk6IHZvaWQge1xuICAgICAgICBjbGVhcl9jaG9pY2VfZGl2KClcbiAgICAgICAgbGV0IHBhaXIgPSB0aGlzLm9mX2ludGVyZXN0KClcbiAgICAgICAgaWYgKHBhaXJbMF0gIT0gZmFsc2UpIHtcbiAgICAgICAgICAgIGRyYXdfY2hvaWNlKHBhaXJbMV1bMF0sIHBhaXJbMV1bMV0pXG4gICAgICAgICAgICBkcmF3X2VzdGltYXRlKHRoaXMucG9zZXQoKS5lc3RpbWF0ZV9xdWVzdGlvbnNfcmVtYWluaW5nKHRoaXMubWF4X2ludGVyZXN0KSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRyYXdfYXNzaWdubWVudCh0aGlzLnBvc2V0KCkucHJpbnRfdmFsaWQoKS5yZXZlcnNlKCkuc2xpY2UoMCwgdGhpcy5tYXhfaW50ZXJlc3QpKVxuICAgICAgICAgICAgaGlkZV9lc3RpbWF0ZSgpXG4gICAgICAgIH1cbiAgICAgICAgZHJhd19oaXN0b3J5KHRoaXMuY29tcGFyaXNvbl9oaXN0b3J5KVxuICAgIH1cbiAgICB1bmRvKCk6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5wb3NldF9oaXN0b3J5Lmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIHRoaXMucG9zZXRfaGlzdG9yeS5zaGlmdCgpXG4gICAgICAgICAgICB0aGlzLmNvbXBhcmlzb25faGlzdG9yeS5zaGlmdCgpXG4gICAgICAgICAgICBoaWRlX2Fzc2lnbm1lbnQoKVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuc3VnZ2VzdCgpXG4gICAgfVxuICAgIHJlbWFpbmluZygpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5wb3NldCgpLmVzdGltYXRlX3F1ZXN0aW9uc19yZW1haW5pbmcodGhpcy5tYXhfaW50ZXJlc3QpXG4gICAgfVxufVxuXG5mdW5jdGlvbiBjbGVhcl9oaXN0b3J5KCkge1xuICAgIGxldCBkaXYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImhpc3RvcnlcIilcbiAgICBkaXYhLmlubmVySFRNTCA9IFwiXCJcbn1cblxuZnVuY3Rpb24gZHJhd19oaXN0b3J5KGNvbXBhcmlzb25zOiBbc3RyaW5nLCBzdHJpbmddW10pIHtcbiAgICBjbGVhcl9oaXN0b3J5KClcblxuICAgIGxldCBkaXYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImhpc3RvcnlcIilcbiAgICBpZiAoY29tcGFyaXNvbnMubGVuZ3RoID4gMCkge1xuXG4gICAgICAgIGxldCBsYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIilcbiAgICAgICAgbGV0IHVuZG9CdXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpXG4gICAgICAgIHVuZG9CdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGV2ID0+IHtcbiAgICAgICAgICAgIFZHLnVuZG8oKVxuICAgICAgICB9KVxuICAgICAgICB1bmRvQnV0dG9uLmlubmVyVGV4dCA9IFwiVW5kbyBMYXN0XCJcbiAgICAgICAgbGFiZWwuYXBwZW5kQ2hpbGQodW5kb0J1dHRvbilcbiAgICAgICAgbGFiZWwuY2xhc3NMaXN0LmFkZChcInRocmVlLXdpZGVcIilcbiAgICAgICAgZGl2IS5hcHBlbmRDaGlsZChsYWJlbClcbiAgICAgICAgY29tcGFyaXNvbnMuZm9yRWFjaChjID0+IHtcbiAgICAgICAgICAgIGxldCBjcDEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXG4gICAgICAgICAgICBsZXQgY3AyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuICAgICAgICAgICAgbGV0IGNwMyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIilcblxuICAgICAgICAgICAgY3AxLmlubmVyVGV4dCA9IGNbMF1cbiAgICAgICAgICAgIGNwMi50ZXh0Q29udGVudCA9IFwiPlwiXG4gICAgICAgICAgICBjcDMuaW5uZXJUZXh0ID0gY1sxXVxuXG4gICAgICAgICAgICBkaXYhLmFwcGVuZENoaWxkKGNwMSlcbiAgICAgICAgICAgIGRpdiEuYXBwZW5kQ2hpbGQoY3AyKVxuICAgICAgICAgICAgZGl2IS5hcHBlbmRDaGlsZChjcDMpXG4gICAgICAgIH0pXG4gICAgfVxufVxuXG5mdW5jdGlvbiBjbGVhcl9jaG9pY2VfZGl2KCkge1xuICAgIGxldCBkaXYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNvbXBhcmlzb25zXCIpXG4gICAgZGl2IS5pbm5lckhUTUwgPSBcIlwiXG59XG5cblxuZnVuY3Rpb24gaGlkZV9lc3RpbWF0ZSgpIHtcbiAgICBsZXQgZGl2ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJlc3RpbWF0ZVwiKVxuICAgIGRpdiEuY2xhc3NMaXN0LmFkZChcImludmlzaWJsZVwiKVxuICAgIGRpdiEuaW5uZXJIVE1MID0gXCJcIlxufVxuXG5mdW5jdGlvbiBkcmF3X2VzdGltYXRlKGVzdGltYXRlOiBudW1iZXIpIHtcbiAgICBsZXQgZGl2ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJlc3RpbWF0ZVwiKVxuICAgIGRpdiEuY2xhc3NMaXN0LnJlbW92ZShcImludmlzaWJsZVwiKVxuICAgIGxldCBlc3RpbWF0ZV90ZXh0ID0gZXN0aW1hdGUudG9TdHJpbmcoKVxuICAgIGlmIChlc3RpbWF0ZSA8IDEwKSB7XG4gICAgICAgIGVzdGltYXRlX3RleHQgPSBcIlVuZGVyIDEwXCJcbiAgICB9XG4gICAgZGl2IS5pbm5lckhUTUwgPSBgRXN0aW1hdGVkIHF1ZXN0aW9ucyByZW1haW5pbmc6ICR7ZXN0aW1hdGVfdGV4dH1gXG59XG5cblxuXG5mdW5jdGlvbiBoaWRlX2Fzc2lnbm1lbnQoKSB7XG4gICAgbGV0IGRpdiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYXNzaWdubWVudFwiKVxuICAgIGRpdiEuY2xhc3NMaXN0LmFkZChcImludmlzaWJsZVwiKVxuICAgIGRpdiEuaW5uZXJIVE1MID0gXCJcIlxufVxuXG5mdW5jdGlvbiBkcmF3X2Fzc2lnbm1lbnQodmFsdWVzOiBzdHJpbmdbXSkge1xuICAgIGxldCBkaXYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImFzc2lnbm1lbnRcIilcbiAgICBkaXYhLmNsYXNzTGlzdC5yZW1vdmUoXCJpbnZpc2libGVcIilcbiAgICBkaXYhLmlubmVySFRNTCA9IGA8aDE+WW91ciB0b3AgdmFsdWVzLCByYW5rZWQ8L2gxPmAgKyB2YWx1ZXMubWFwKHYgPT4gYDxkaXYgY2xhc3M9J3ZhbHVlUmVwb3J0Jz48aDI+JHt2fTwvaDI+PHA+JHsoRGVmaW5pdGlvbnMgYXMgYW55KVt2XX08L3A+PC9kaXY+YCkuam9pbihcIlxcblwiKVxufVxuXG5mdW5jdGlvbiByRnJvbTxUPih3ZWlnaHRlZDogW1QsIG51bWJlcl1bXSk6IFQge1xuICAgIGxldCB0b3RhbCA9ICh3ZWlnaHRlZC5tYXAodiA9PiB2WzFdKSkucmVkdWNlKChhLCBiKSA9PiBhICsgYilcbiAgICBsZXQgciA9IE1hdGgucmFuZG9tKCkgKiB0b3RhbFxuICAgIHdoaWxlIChyID4gMCkge1xuICAgICAgICBsZXQgcG9wcGVkID0gd2VpZ2h0ZWQucG9wKCkgYXMgW1QsIG51bWJlcl1cbiAgICAgICAgciAtPSBwb3BwZWRbMV1cbiAgICAgICAgaWYgKHIgPCAwKSB7XG4gICAgICAgICAgICByZXR1cm4gcG9wcGVkWzBdXG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gU2hvdWxkIG5ldmVyIHJlYWNoIGhlcmVcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJXZWlnaHRlZCBsaXN0IHdhcyBlbXB0eVwiKVxufVxuXG5mdW5jdGlvbiBkcmF3X2Nob2ljZSh2MTogc3RyaW5nLCB2Mjogc3RyaW5nKSB7XG4gICAgbGV0IGRpdiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY29tcGFyaXNvbnNcIilcbiAgICBmdW5jdGlvbiBidXR0b24odjogc3RyaW5nLCB3OiBzdHJpbmcpOiBIVE1MRWxlbWVudCB7XG4gICAgICAgIGxldCBiID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKVxuICAgICAgICBiLmlubmVyVGV4dCA9IHZcbiAgICAgICAgYi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZXYgPT4ge1xuICAgICAgICAgICAgVkcuY2hvb3NlKHYsIHcpXG4gICAgICAgIH0pXG4gICAgICAgIHJldHVybiBiXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWluaV9sYWJlbCh2OiBzdHJpbmcpOiBIVE1MRWxlbWVudCB7XG4gICAgICAgIGxldCBkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuICAgICAgICBkLmlubmVyVGV4dCA9IChEZWZpbml0aW9ucyBhcyBhbnkpW3ZdXG4gICAgICAgIGQuY2xhc3NMaXN0LmFkZChcImRlZmluaXRpb25cIilcbiAgICAgICAgcmV0dXJuIGRcbiAgICB9XG4gICAgbGV0IGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImgxXCIpXG4gICAgbGFiZWwuY2xhc3NMaXN0LmFkZChcImhlYWRlclwiKVxuICAgIGxhYmVsLmNsYXNzTGlzdC5hZGQoXCJ0d28td2lkZVwiKVxuICAgIGxhYmVsLmlubmVySFRNTCA9IFwiV2hpY2ggaXMgbW9yZSBpbXBvcnRhbnQ/XCJcbiAgICBjbGVhcl9jaG9pY2VfZGl2KClcbiAgICBkaXYhLmFwcGVuZENoaWxkKGxhYmVsKVxuICAgIGRpdiEuYXBwZW5kQ2hpbGQoYnV0dG9uKHYxLCB2MikpXG4gICAgZGl2IS5hcHBlbmRDaGlsZChidXR0b24odjIsIHYxKSlcbiAgICBkaXYhLmFwcGVuZENoaWxkKG1pbmlfbGFiZWwodjEpKVxuICAgIGRpdiEuYXBwZW5kQ2hpbGQobWluaV9sYWJlbCh2MikpXG59XG5cbmxldCBWRzogVmFsdWVzR2FtZVxuZnVuY3Rpb24gc3RhcnQoKSB7XG4gICAgbGV0IG1heF9hbmRfY2F0ZWdvcmllcyA9IHJlYWRfR0VUKClcbiAgICBsZXQgY2F0ZWdvcmllcyA9IG1heF9hbmRfY2F0ZWdvcmllc1sxXVxuICAgIGxldCBtYXhfdG9fZGV0ZXJtaW5lID0gbWF4X2FuZF9jYXRlZ29yaWVzWzBdXG4gICAgVkcgPSBuZXcgVmFsdWVzR2FtZShtYXhfdG9fZGV0ZXJtaW5lLCBjYXRlZ29yaWVzKVxuICAgIFZHLnN1Z2dlc3QoKVxufVxuXG5sZXQgcmVhZF9HRVQgPSBmdW5jdGlvbiAoKTogW251bWJlciwgQ2F0ZWdvcmllc1tdXSB7XG4gICAgbGV0IGJyZWFrX2F0X3F1ZXN0aW9uX21hcmsgPSB3aW5kb3cubG9jYXRpb24udG9TdHJpbmcoKS5zcGxpdCgvXFw/LylcbiAgICBsZXQgYWxsX2NhdGVnb3JpZXMgPSBPYmplY3Qua2V5cyhDYXRlZ29yaWVzKS5maWx0ZXIoayA9PiBOdW1iZXIuaXNOYU4oK2spKSBhcyBDYXRlZ29yaWVzW107XG4gICAgaWYgKGJyZWFrX2F0X3F1ZXN0aW9uX21hcmsubGVuZ3RoID09IDEpIHtcbiAgICAgICAgcmV0dXJuIFs1LCBhbGxfY2F0ZWdvcmllc11cbiAgICB9XG4gICAgbGV0IGluc3RydWN0aW9ucyA9IGJyZWFrX2F0X3F1ZXN0aW9uX21hcmtbMV1cbiAgICBsZXQgbWF4X3RvX2ZpbmQgPSA1XG4gICAgbGV0IGNhdGVnb3JpZXNfdG9faW5jbHVkZSA9IGFsbF9jYXRlZ29yaWVzXG4gICAgaW5zdHJ1Y3Rpb25zLnNwbGl0KFwiJlwiKS5tYXAocyA9PiB7XG4gICAgICAgIGxldCBwYXJ0cyA9IHMuc3BsaXQoXCI9XCIpXG4gICAgICAgIGlmIChwYXJ0c1swXSA9PSBcImluY2x1ZGVcIikge1xuICAgICAgICAgICAgY2F0ZWdvcmllc190b19pbmNsdWRlID0gW11cbiAgICAgICAgICAgIGxldCBjYXRzID0gcGFydHNbMV0uc3BsaXQoXCIsXCIpXG4gICAgICAgICAgICBjYXRzLmZvckVhY2gocmVxdWVzdGVkX2NhdCA9PiB7XG4gICAgICAgICAgICAgICAgYWxsX2NhdGVnb3JpZXMuZm9yRWFjaChyZWFsX2NhdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWFsX2NhdCA9PSByZXF1ZXN0ZWRfY2F0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yaWVzX3RvX2luY2x1ZGUucHVzaChyZWFsX2NhdClcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIGlmIChwYXJ0c1swXSA9PSBcIm1heFwiKSB7XG4gICAgICAgICAgICBtYXhfdG9fZmluZCA9IHBhcnNlSW50KHBhcnRzWzFdKVxuICAgICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gW21heF90b19maW5kLCBjYXRlZ29yaWVzX3RvX2luY2x1ZGVdXG59Il19