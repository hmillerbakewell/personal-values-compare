# personal-values-compare

This website makes it easy to determine, in order, one's top five values from a list.
It does this via rounds of binary comparison,
assuming a poset structure on values.

## The values

These values are broken down by category to make the process quicker.
Some values appear in multiple categories:

Career:

 - Compassion: Recognising the needs of others
 - Helping Others: Directly helping those around you
 - Leadership: People look to you for guidance
 - Politics: Serving the public
 - Reputation: The things strangers might know you for
 - Responsibility: Being trusted by others
 - Status: The higher up the ladder the better
 - Wealth: Beyond financial stability

Home Environment:

 - Bustle: Always having something going on
 - Cooking: Preparing food in your own home
 - Fresh Air: Access to a clean environment
 - Peace: Quiet surroundings
 - Pets: Having pets at home
 - Physical Independence: Living without routine assistance

Exercise and Body:

 - Appearance: How you look
 - Dancing: Alone or with others
 - Exercise: Things you do to keep fit, but not Sport
 - Sport: Watching or taking part in

Hobbies:

 - Games: Boardgames, cards, computer games, etc.
 - Giving Gifts: Finding or making gifts for others
 - Learning: Amassing knowledge and skills
 - Performing Arts: Music, theatre, etc.
 - Quality Time: Being with friends and loved ones, no matter the activity
 - Quiet Hobbies: Occupied moments of calm
 - Visual Arts and Crafts: Creating or admiring
 - Working Out: Keeping fit, but not Sport

Long Term Attitudes:

 - Adventure: Finding new excitements
 - Challenge: Pushing yourself, regardless of the goal
 - Curiosity: Encountering new ideas
 - Growth: Knowing you are changing and adapting
 - Stability: Confidence that next week will be like this week

Relationships and Faith:

 - Community: Being part of a large group
 - Emotional Independence: Your mood is not reliant on the actions of others
 - Faith: Connection to something beyond humanity
 - Family: Regular connection with family
 - Friendship: Deep relationships within a small group
 - Love: Finding people to share your heart with
 - Religion: The routine, structure, and community, as opposed to Faith


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

## Versioning

Notable changes are given a new version number,
but this is mostly hidden from the user.
Specific versions can be linked by replacing the "/latest/" part of the URL
with the version number.
