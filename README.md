# personal-values-compare

This website makes it easy to determine, in order, one's top five values from a list.
It does this via rounds of binary comparison,
assuming a poset structure on values.

## The values

These values are:

 - Adventure: Finding new excitements
 - Appearance: Beauty, presence, and fashion
 - Challenge: Pushing yourself, regardless of the goal
 - Community: Being part of a large group
 - Curiosity: Encountering new ideas
 - Dancing: Alone or with others
 - Emotional Independence: Your mood is not reliant on the actions of others
 - Exercise: Things you do to keep fit
 - Faith: Connection to something beyond humanity
 - Fresh Air: Access to a clean environment
 - Friendship: Deep relationships within a small group
 - Games: Boardgames, cards, computer games, etc.
 - Independence: Living without routine assistance
 - Learning: Amassing knowledge and skills
 - Love: Finding people to share your heart with
 - Peace: Quiet surroundings or internal peace
 - Performing Arts: Music, theatre, etc.
 - Pets: Having pets at home
 - Physical Independence: Living without routine assistance
 - Quiet Hobbies: Occupied moments of calm
 - Religion: The routine, structure, and community, as opposed to Faith
 - Reputation: The things strangers might know you for
 - Responsibility: Being trusted by others
 - Stability: Confidence that next week will be like this week
 - Sport: Watching or taking part in
 - Treats: Indulging yourself
 - Visual Arts and Crafts: Creating or admiring
 - Work: Fulfilling employment

These values, and their definitions, have been determined through limited research and self-reflection,
rather than scientific research.
They are geared towards questions of disability and infirmity,
to help those with limited resources determine how to prioritise.

## Making changes

All of this code, including the list of values and definitions,
is released under the MIT license (see side-bar, or the LICENSE file).

This website is written using TypeScript, which is then compiled to JavaScript.
The list of values and definitions are stored as `Definitions`,
and the logic for determining which question to ask next is in `ValuesGame`.


