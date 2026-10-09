# Pulse_3.0
Application: https://app.emergent.sh/share-preview?app=exp%3A%2F%2Fpulse-care-4.preview.emergentagent.com%3Fexpo_go_prompt_device_auth%3D1%26expo_go_device_auth_verification_uri_override%3Dapp.emergent.sh&job_id=9b9ccb01-bad7-4fb8-ae01-3db1c70c82dc

Wireframe reference: https://pulse-ten-teal-54.vercel.app/

Wireframe consists of everything from scratch, but app application is a simple version.
We are not having figma public access, so for wireframes we are sharing versal link

🎯 1. **Overview**: 
Pulse is a health-awareness companion designed to help people build sustainable everyday health habits, understand self-reported trends, and prepare for more informed conversations with healthcare professionals.

Traditional healthcare often focuses on **short consultations**, while the daily routines that influence long-term wellbeing happen between appointments. Pulse explores a more **continuous model of care** by bringing health awareness, daily check-ins, **progress tracking**, Community bundling features, family involvements as a group, and doctor-visit
preparation into one experience.

🎯 2. **Problem Statement**

Chronic care in India faces an **engagement gap** and a **trust deficit**. Patients may meet a doctor for a brief consultation and then manage their routines largely on their own until the next visit. In the meantime, relevant information about sleep, food, stress, activity, medication routines, and symptoms can be scattered or forgotten.

The problem is driven by:

-   **Episodic disconnect:** Healthcare professionals have limited visibility into daily routines between appointments.
-   **Motivation decay:** Users often abandon lifestyle routines when  tracking feels repetitive or disconnected from visible progress.
-   **Data silos:** Health information is spread across reports,  prescriptions, activity records, and personal recollections.
-   **Misinformation:** Social platforms and informal channels can  circulate unreliable or potentially harmful health advice.
-   **Stigma and privacy concerns:** People may avoid seeking support or  sharing health information because they fear judgement or unwanted  disclosure.

**How might we help people maintain meaningful health routines between clinical visits, understand their self-reported progress, and shar useful context with healthcare professionals---without increasing effort or compromising privacy?**

👤 3. User Persona

### Primary User: Ananya --- Young professional managing PCOS

-   **Age:** 24
-   **Location:** Bengaluru, India
-   **Occupation:** Software engineer
-   **Context:** Diagnosed with PCOS; experiences irregular sleep and  high work stress and frequently orders food.
-   **Digital behaviour:** Comfortable with apps and wearables; has  already tried fitness apps and an online diet plan.
    
<img width="382" height="645" alt="{54B8C82F-E6D0-4715-AE38-8854B06CD64E}" src="https://github.com/user-attachments/assets/f3514c0d-7b34-4cf9-ac2b-10674aa172d5" />

### Goals

-   Understand patterns in her self-reported health habits.
-   Build routines that fit around a **busy work** schedule.
-   Track relevant symptoms and **progress without excessive effort**.
-   Prepare for healthcare consultations with organised information.
-   Keep her health information private and in her control.

### Pain Points

-   Previous apps and diet plans **did not sustain** engagement.
-   Health tracking can feel like **extra work**.
-   Work stress and irregular sleep make routines **difficult to maintain**.
-   She does not want her condition **disclosed** to family or flatmates.
-   She needs **trustworthy, understandable information** rather than  generic or unsupported advice.

## 🎯 4. Goals

### User Goals

-   Build a **manageable daily health-awareness** routine.
-   Understand changes in **self-reported habits** and wellbeing over time.
-   Track progress without feeling that logging is homework.
-   Keep health information **organised** in one place.
-   Prepare a **concise summary** before a doctor visit.
-   Control who can access sensitive health information.

### Product Goals

-   Improve **consistency** of meaningful health behaviours, not just app opens.
-   Help users notice patterns in their **own** reported data.
-   Make progress **understandable** without complex diagnosing or prescribing.
-   Support **better-informed conversations** with healthcare professionals.
-   Measure whether ongoing engagement improves care continuity.

## 💢 5. Pain Points

  -----------------------------------------------------------------------
  Pain point              User impact             Product opportunity
  ----------------------- ----------------------- -----------------------
  Long gaps between       Daily context may be    Maintain a simple
  doctor visits           forgotten or            **health timeline** and
                          unavailable during      visit summary
                          appointments            

  Repetitive tracking     Users **lose** motivation   Short check-ins and
                          and abandon routines    **visible progress**

  Fragmented health       Trends are difficult to    Organise self-reported
  information             recognise                 logs and uploaded
                                                    reports in one place

  Untrusted health advice Users struggle to know      Use clear, cautious
                        **  what to believe **        language and encourage
                                                      professional guidance

  Privacy and stigma      Users may avoid         Private-by-default data
                          tracking or seeking     and **consent-based**
                          support                 sharing

  Busy schedules or low Existing tools may feel Simple flows and digital confidence difficult to maintain minimal daily effort
  -----------------------------------------------------------------------

## 🚨 6. Product Vision

To become a **trusted everyday health-awareness companion** that helps people stay in **rhythm with their health** between clinical visits.

Pulse aims to make continuous care feel supportive, understandable, and respectful of privacy. It should help users connect day-to-day habits with longer-term progress and provide a concise view of what happened between visits---when the user chooses to share it.

**Product journey: Assess → Understand → Act → Track → Prepare → Get Support**

Pulse App itself does not diagnose conditions, prescribe treatment, or replace a registered medical practitioner, it uses consultations of doctors to give the report and diagnosis.

## 🖥️ 7. Solution Design

The proposed experience is organised around a** lightweight health-awareness & Engagement loop**

### Step 1 --- Assess & Understand

**Objective:** Establish a starting point using information the user chooses to share.

**Key features:** - Health profile and self-reported assessment - **Pulse awareness score** and **wellbeing dimensions** - Explanation of what the score means and its limitations
<img width="386" height="349" alt="{F789E667-5AB2-4C58-B64C-55942A3FABEF}" src="https://github.com/user-attachments/assets/52d5b724-4daf-4652-9af5-70cf578963e2" />

**Why this matters:** Users need a clear starting point and understandable feedback---not a diagnosis or an unexplained number.

### Step 2 --- Act & Track

**Objective:** Help users maintain manageable routines and see progress over time.

**Key features:** - Pulse 60 daily check-in - Movement, nourishment, and wellbeing tracking - Check-in progress and history - Relevant symptom and cycle tracking - Health timeline and report organisation
<img width="375" height="512" alt="{21204A59-1EB8-41A5-A690-18F6D487868E}" src="https://github.com/user-attachments/assets/276f6ae1-1564-4dda-85b9-dd3b78a4bb60" />

**Why this matters:** Small, low-friction actions can make ongoing tracking easier to sustain.

### Step 3 --- Prepare & Get Support

**Objective:** Help users organise information for professional care.

**Key features:** - Concise doctor-visit summary - Doctor discovery and filtering flows - Appointment-related screens - Privacy and consent controls for sharing information

**Why this matters:** A structured summary can help users communicate what happened between visits. Real doctor verification, availability, booking, and sharing workflows require production integrations.


<img width="260" height="520" alt="{AF97C87D-73D3-40FB-B9D9-95FE9D412003}" src="https://github.com/user-attachments/assets/33d4932b-25f0-40a7-8e41-7be8ed4f1cee" />
<img width="379" height="508" alt="{4F065CC4-F1B6-4341-B138-241E6EC1559B}" src="https://github.com/user-attachments/assets/bb923643-6fb9-4511-81e0-014f9583aed1" />


## 🏗️ 8. MVP Features

The current prototype demonstrates these proposed MVP experiences. A
screen or interaction in the prototype does not automatically mean that
a production backend or live integration is available.

  -----------------------------------------------------------------------
  Feature                             Purpose
  ----------------------------------- -----------------------------------
  Health profile and assessment       Capture user-provided details and
                                      health-awareness responses

  Pulse awareness score               Show a snapshot of reported habits
                                      and wellbeing dimensions

  Pulse 60 daily check-in             Encourage lightweight movement,
                                      nourishment, and wellbeing routines

  Progress and health timeline        Help users review check-ins and
                                      reported changes over time

  Symptom and cycle tracking          Support relevant self-reported logs
                                      for users who choose to use them

  Health report uploads               Organise user-provided reports; no
                                      report interpretation is implied

  Doctor discovery                    Demonstrate doctor search and
                                      filtering; sample profiles must be
                                      verified before real use

  Appointment flow                    Demonstrate appointment-related
                                      screens; live availability and
                                      confirmation need a real scheduling
                                      integration

  Doctor-visit summary                Prepare a concise view of
                                      user-reported habits and changes

  Privacy and consent controls        Demonstrate user control over
                                      information sharing

  Community/support concepts          Explore peer support, subject to
                                      moderation and privacy safeguards
  -----------------------------------------------------------------------
  <img width="382" height="498" alt="{3C2934C7-B4FC-4DE7-8ED6-9DE12FDC72F0}" src="https://github.com/user-attachments/assets/af920ef1-23b4-499f-b440-69830852e1b0" />


## ✨ 9. Future Enhancements (Premium Features)

Potential premium features, subject to user research, clinical review,
feasibility, and willingness-to-pay validation:

-   **Personalised care loop:** Clinician-approved goals, follow-up reminders, and progress reviews.
-   **Doctor-reviewed summaries:** Structured summaries users can choose to share with healthcare professionals.
-   **Consultation support:** Verified provider availability, appointment booking, and follow-up reminders.
-   **Advanced trend insights:** More detailed views of self-reported patterns, with limitations clearly explained.
-   **Care Circle:** Optional sharing with a trusted caregiver or family member using granular, revocable permissions.
-   **Guided programmes:** Habit-building journeys reviewed by qualified  professionals.
-   **Wearable integrations:** Import supported activity or sleep data with explicit permission.
-   **Premium educational content:** Clinically reviewed resources and additional progress-reporting capabilities.


## 📊 10. Success Metrics --- Engagement

Pulse should optimise for meaningful continuity of care rather than raw app activity.

### Proposed North Star Metric: Care Rhythm

**Care Rhythm = the percentage of days since the last appointment on which the user's agreed, clinician-set plan was followed**, where a plan exists and the user has chosen to track it.

This metric requires a clearly defined plan and reliable recording. It should be validated before being used to support any health-outcome claim.

### Supporting Metrics

-   **Weekly active users (WAU):** Users completing at least one meaningful health action in a week.
-   **Check-in completion rate:** Completed check-ins divided by eligible check-in opportunities.
-   **In-rhythm days per week:** Days on which users report following their agreed plan.
-   **Week 1 and Week 4 retention:** Percentage of new users returning in the first and fourth weeks.
-   **Assessment completion rate:** Percentage of users who finish the initial assessment.
-   **Health summary usage:** Percentage of users who generate or view a visit summary.
-   **Consent-based sharing rate:** Percentage of users who voluntarily share a summary with a professional.


## ⚙️ 11. Operational Metrics

-   **Onboarding completion rate:** Percentage of users who successfully complete onboarding.
-   **Authentication success rate:** Successful logins divided by valid login attempts.
-   **Data persistence success rate:** Percentage of records saved and retrievable after a session or device restart.
-   **Service availability:** Availability of authentication, profile, check-in, and history services.
-   **Error rate:** Failed requests and user actions by feature.
-   **Upload success rate:** Successful uploads divided by attempted uploads.
-   **Appointment request fulfilment:** Percentage of requests receiving a valid, timely status update.
-   **Doctor verification coverage:** Percentage of displayed doctor profiles with verified credentials and current details.
-   **Support response time:** Time to acknowledge and resolve user-reported issues.
-   **Privacy and security incidents:** Number and severity of unauthorised-access events, consent failures, or data-handling incidents.


## 🧭 12. User Experience Metrics

-   **Time to first value:** Time from account creation to the first completed assessment or meaningful check-in.
-   **Check-in completion time:** Median time needed to complete a daily check-in.
-   **Task success rate:** Percentage of users who complete key tasks without assistance.
-   **Drop-off rate:** Percentage of users abandoning onboarding, asessment, check-in, or appointment flows.
-   **Usability satisfaction:** User-reported ease of use after a task or during periodic feedback.
-   **Perceived usefulness:** Percentage of users who say Pulse helps them understand their reported habits or prepare for a consultation.
-   **Trust and clarity:** User understanding of the Pulse score, its limitations, and what information is shared.
-   **Accessibility and device performance:** Task success and loading performance on budget Android devices and slower connections.
-   **Privacy-control success:** Percentage of users who can correctly view, grant, revoke, or understand sharing permissions.
-   **Qualitative feedback:** Themes from user interviews, usability sessions, and support feedback.

These metrics should be measured through **usability testing** and
appropriately consented product analytics. Establish baselines before
setting targets.

## 🧠 Product Thinking & Design Decisions

### 1. Make tracking lightweight

Daily health routines should not feel like another demanding task. Pulse uses short check-ins and visible progress to reduce friction.

### 2. Explain progress through continuous engagement 

The Pulse score is intended as a health-awareness aid based on user-reported information. It must not be presented as a validated clinical score without appropriate evidence and review.

### 3. Keep sensitive data private by default

Health information should be visible only to the account owner unless the user explicitly grants access. Sharing permissions should be understandable and revocable.

### 4. Support clinicians rather than replace them

Pulse can organise information and prepare summaries, while diagnosis and treatment decisions remain with qualified healthcare professionals.

### 5. Be honest about product states

Demo data, fictional doctor profiles, pending appointment requests, and simulated interactions must be clearly distinguished from verified information and confirmed real-world actions.

## 🔮 13. Future Scope

Future versions of Pulse could expand through the following steps:

1.  **Validate the beachhead:** Interview target users and healthcare professionals to confirm the highest-value initial use case.
2.  **Complete the secure backend:** Implement authentication, account-specific data storage, access controls, backups, and
    recovery.
3.  **Validate scoring and safety rules:** Review health-related copy, scoring logic, thresholds, and escalation flows with qualified clinicians.
4.  **Connect verified care providers:** Integrate provider credentials, availability, appointment status, and follow-up workflows.
5.  **Improve interoperability:** Explore user-consented connections to wearables, lab records, and other health-data sources.
6.  **Build a safe support ecosystem:** Add moderation, reporting, blocking, and privacy safeguards before launching community
    features.
7.  **Test accessibility and reliability:** Validate the experience on budget Android devices, low-bandwidth connections, and varied digital-literacy levels.
8.  **Run outcome-oriented pilots:** Evaluate whether Pulse improves care continuity and user-reported behaviours over time. Clinical efficacy must not be claimed without appropriate evidence.
9.  **Explore sustainable monetisation:** Test willingness to pay and potential partnerships while keeping trust, privacy, and affordability central.

## 📁 Repository Contents
Readme
main
Wireframe file
Presentation file
Follow this steps to use app: <img width="328" height="382" alt="{A27AEBC3-81F0-45C0-BC81-238B1D04D47A}" src="https://github.com/user-attachments/assets/1f45f598-f3b5-414e-8390-b9a31bfa4ab6" />



```📌 Conclusion: Pulse reimagines health support as an ongoing journey rather than a series of isolated consultations. By combining lightweight daily check-ins, understandable progress views, organised health information, and preparation for professional care, the product aims to help people stay engaged between visits. The next step is to validate the priority user need, implement secure data handling, and test whether the experience improves meaningful care continuity. ## Project Status & Safety Notice: Pulse is an MVP/prototype concept. Sample values, sample doctor profiles, draft scoring rules, and simulated interactions must not be treated as verified patient data, clinical recommendations, confirmed appointments, or evidence of health outcomes.



