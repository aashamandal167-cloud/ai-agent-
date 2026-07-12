==========================================================
discoveryBrain.js
==========================================================

PURPOSE
--------
DiscoveryBrain ka kaam unknown WhatsApp lead se conversation start karna hai.

Ye kabhi bhi direct website sell nahi karega.

Iska objective hai:

• Reply lena
• Trust build karna
• Business identify karna
• Business problem samajhna
• Story sunane ki permission lena

Uske baad StoryBrain ko control de dena.

----------------------------------------------------------

INPUT
------

customerName
businessName
businessCategory
city
phoneNumber
conversationStage
lastMessage
replied
followupCount

----------------------------------------------------------

OUTPUT
-------

reply
nextStage
nextBrain

----------------------------------------------------------

RESPONSIBILITIES
----------------

✓ First Message

✓ No Reply Follow-up

✓ Greeting

✓ Permission

✓ Business Discussion

✓ Business Problem Discussion

✓ Industry Detection

✓ Story Permission

✓ Next Brain Decide

✓ Fallback Response

----------------------------------------------------------

FUNCTIONS
----------

canHandle()

process()

sendFirstMessage()

sendFollowup()

handleReply()

greetCustomer()

askPermission()

askBusinessProblem()

detectIndustry()

askStoryPermission()

nextBrain()

fallback()

----------------------------------------------------------

STATE FLOW
-----------

START

↓

FIRST_MESSAGE

↓

WAIT_REPLY

↓

NO_REPLY

↓

FOLLOWUP

↓

WAIT_REPLY

↓

REPLY_RECEIVED

↓

GREETING

↓

ASK_PERMISSION

↓

BUSINESS_DISCUSSION

↓

BUSINESS_PROBLEM

↓

ASK_STORY_PERMISSION

↓

STORY_READY

↓

NEXT BRAIN = storyBrain

----------------------------------------------------------

ENTRY RULE
-----------

DiscoveryBrain tabhi start hoga jab

• Naya Lead aaye

Ya

• Unknown Customer ho

Ya

• WhatsApp Conversation Start karni ho

----------------------------------------------------------

EXIT RULE
----------

Agar customer bole

• Haan
• Ji
• Bataiye
• Batao
• Continue
• Sun Raha Hu
• Okay

To

nextBrain = storyBrain

----------------------------------------------------------

FORBIDDEN
-----------

❌ Price nahi batayega

❌ Package nahi batayega

❌ Discount nahi dega

❌ Payment nahi mangega

❌ Demo Link nahi bhejega

❌ Negotiation nahi karega

----------------------------------------------------------

ALLOWED
---------

✅ Greeting

✅ Respect

✅ Trust Build

✅ Business Discussion

✅ Curiosity Create

✅ Story Permission

----------------------------------------------------------

FALLBACK
----------

Agar customer ajeeb reply de

Example

"Hmm"

"Kya"

"😂"

"Busy"

To Raj politely reply karega aur conversation ko Business Discussion par wapas layega.

----------------------------------------------------------

SUCCESS CONDITION
------------------

DiscoveryBrain tab complete mana jayega jab customer Story sunne ke liye ready ho jaye.

Return

reply

nextStage = "story"

nextBrain = "storyBrain"

==========================================================
DISCOVERY BRAIN STATUS

Purpose                ✅

Input                  ✅

Output                 ✅

Responsibilities       ✅

Functions              ✅

State Flow             ✅

Entry Rule             ✅

Exit Rule              ✅

Golden Rules           ✅

Fallback               ✅

Success Condition      ✅

STATUS = COMPLETED ✅
==========================================================
