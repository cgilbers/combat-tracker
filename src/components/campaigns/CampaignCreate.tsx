import { zodResolver } from "@hookform/resolvers/zod";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import {
    Box,
    Button,
    Container,
    Grid,
    IconButton,
    Paper,
    TextField,
    Typography,
} from "@mui/material";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "../../auth/useAuth";
import { createCampaign } from "../../firebase/data/campaign";
import type { CampaignData } from "../../firebase/schemas/CampaignData";

const formSchema = z.object({
    name: z.string(),
    playersList: z
        .array(
            z.object({
                id: z.string(),
                playerName: z.string(),
                characterName: z.string(),
            })
        )
        .min(1, "Please add at least one player"),
});

type FormData = z.infer<typeof formSchema>;

export const CampaignCreate = () => {
    const { user } = useAuth();
    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
        setValue,
    } = useForm<{
        name: string;
        playersList: PlayerEntry[];
    }>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            playersList: [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "playersList",
    });

    const onSubmit = (data: FormData) => {
        if (!user) return;

        const players: CampaignData["players"] = data.playersList.reduce(
            (prev, item) => ({
                ...prev,
                [item.id]: {
                    playerName: item.playerName,
                    characterName: item.characterName,
                },
            }),
            {}
        );

        const campaignData: CampaignData = {
            ownerId: user.uid,
            name: data.name,
            players,
            createdAt: Date.now(),
        };

        createCampaign(campaignData, user.uid);
        console.log("Submitted Campaign Data:", campaignData);
    };

    return (
        <Container maxWidth="md">
            <Typography variant="h4" gutterBottom>
                Create Campaign
            </Typography>
            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
                <TextField
                    fullWidth
                    label="Name"
                    margin="normal"
                    {...register("name")}
                    error={!!errors.name}
                    helperText={errors.name?.message}
                />

                <Box mt={3}>
                    <Typography variant="h6">Players</Typography>
                    {fields.map((field, index) => (
                        <Paper key={field.id} sx={{ p: 2, mt: 2 }}>
                            <Grid container spacing={2} alignItems="center">
                                <Grid size={5}>
                                    <TextField
                                        label="Player name"
                                        fullWidth
                                        {...register(
                                            `playersList.${index}.playerName`
                                        )}
                                    />
                                </Grid>
                                <Grid size={5}>
                                    <TextField
                                        label="Character name"
                                        fullWidth
                                        {...register(
                                            `playersList.${index}.characterName`
                                        )}
                                    />
                                </Grid>
                                <Grid size={2}>
                                    <IconButton
                                        color="error"
                                        onClick={() => remove(index)}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </Grid>
                            </Grid>
                        </Paper>
                    ))}

                    <Box mt={2}>
                        <Button
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={() =>
                                append({
                                    id: crypto.randomUUID(),
                                    playerName: "",
                                    characterName: "",
                                })
                            }
                        >
                            Add Player
                        </Button>
                    </Box>
                </Box>

                <Box mt={4}>
                    <Button type="submit" variant="contained" color="primary">
                        Save
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

type PlayerEntry = {
    id: string;
    playerName: string;
    characterName: string;
};
